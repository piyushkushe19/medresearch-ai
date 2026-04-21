const axios = require('axios');
const logger = require('../utils/logger');

const BASE_URL = process.env.CLINICALTRIALS_BASE_URL || 'https://clinicaltrials.gov/api/v2';
const MAX_TRIALS = 50;

const axiosInstance = axios.create({
  timeout: 30000,
  headers: {
    'User-Agent': 'MedicalResearchAssistant/1.0',
    'Accept': 'application/json',
  },
});

/**
 * Fetch trials from ClinicalTrials.gov v2 API
 */
async function fetchTrials({ condition, intervention = '', location = '', maxResults = MAX_TRIALS }) {
  try {
    const params = {
      'query.cond': condition,
      'query.term': intervention || undefined,
      'filter.overallStatus': 'RECRUITING,NOT_YET_RECRUITING,ACTIVE_NOT_RECRUITING,COMPLETED',
      'fields': [
        'NCTId', 'BriefTitle', 'OfficialTitle', 'OverallStatus', 'Phase',
        'StudyType', 'StartDate', 'CompletionDate', 'EnrollmentCount',
        'BriefSummary', 'DetailedDescription', 'Condition', 'InterventionName',
        'EligibilityCriteria', 'MinimumAge', 'MaximumAge', 'Sex',
        'HealthyVolunteers', 'LocationFacility', 'LocationCity', 'LocationCountry',
        'LocationState', 'LocationContactName', 'LocationContactPhone',
        'LocationContactEMail', 'CentralContactName', 'CentralContactPhone',
        'CentralContactEMail', 'LeadSponsorName', 'PrimaryOutcomeMeasure',
        'SecondaryOutcomeMeasure', 'Keyword',
      ].join('|'),
      'pageSize': Math.min(maxResults, 100),
    };

    if (location) params['query.locn'] = location;

    const response = await axiosInstance.get(`${BASE_URL}/studies`, { params });
    return response.data?.studies || [];
  } catch (error) {
    logger.error(`ClinicalTrials API error: ${error.message}`);
    // Fallback to v1 format if v2 fails
    return await fetchTrialsV1Fallback({ condition, intervention, location, maxResults });
  }
}

/**
 * Fallback to older API format
 */
async function fetchTrialsV1Fallback({ condition, intervention, location, maxResults }) {
  try {
    const params = {
      expr: `${condition}${intervention ? ' AND ' + intervention : ''}`,
      fields: 'NCTId,BriefTitle,OverallStatus,Phase,BriefSummary,EligibilityCriteria,LocationFacility,LocationCity,LocationCountry,CentralContactName,CentralContactPhone,CentralContactEMail,LeadSponsorName,StartDate,CompletionDate',
      min_rnk: 1,
      max_rnk: maxResults,
      fmt: 'json',
    };

    const response = await axiosInstance.get(
      'https://clinicaltrials.gov/api/query/full_studies',
      { params }
    );

    const studies = response.data?.FullStudiesResponse?.FullStudies?.FullStudy || [];
    return studies.map(s => s.Study);
  } catch (err) {
    logger.error(`ClinicalTrials fallback error: ${err.message}`);
    return [];
  }
}

/**
 * Parse a trial from ClinicalTrials v2 API format
 */
function parseTrial(study) {
  if (!study) return null;

  try {
    // Handle both v2 and v1 formats
    const proto = study.protocolSection || study;
    const id = proto?.identificationModule;
    const status = proto?.statusModule;
    const desc = proto?.descriptionModule;
    const eligibility = proto?.eligibilityModule;
    const contacts = proto?.contactsLocationsModule;
    const design = proto?.designModule;
    const outcomes = proto?.outcomesModule;

    const nctId = id?.nctId || study.NCTId || study['@NCTId'];
    if (!nctId) return null;

    const title = id?.briefTitle || id?.officialTitle || study.BriefTitle || 'Unknown Title';
    const overallStatus = status?.overallStatus || study.OverallStatus || 'Unknown';
    const phase = design?.phases?.join(', ') || study.Phase || 'N/A';
    const briefSummary = desc?.briefSummary || study.BriefSummary || '';
    const eligibilityCriteria = eligibility?.eligibilityCriteria || study.EligibilityCriteria || '';
    const minAge = eligibility?.minimumAge || study.MinimumAge || 'N/A';
    const maxAge = eligibility?.maximumAge || study.MaximumAge || 'N/A';
    const sex = eligibility?.sex || study.Sex || 'All';
    const healthyVolunteers = eligibility?.healthyVolunteers || study.HealthyVolunteers || 'No';

    // Locations
    const locationList = contacts?.locations || [];
    const locations = locationList.slice(0, 5).map(loc => ({
      facility: loc.facility || loc.LocationFacility || '',
      city: loc.city || loc.LocationCity || '',
      state: loc.state || loc.LocationState || '',
      country: loc.country || loc.LocationCountry || '',
    }));

    // Contact info
    const centralContacts = contacts?.centralContacts || [];
    const contact = centralContacts[0] || {};
    const contactInfo = {
      name: contact.name || contact.CentralContactName || study.CentralContactName || '',
      phone: contact.phone || contact.CentralContactPhone || study.CentralContactPhone || '',
      email: contact.email || contact.CentralContactEMail || study.CentralContactEMail || '',
    };

    // Sponsor
    const sponsor = proto?.sponsorCollaboratorsModule;
    const sponsorName = sponsor?.leadSponsor?.name || study.LeadSponsorName || '';

    // Dates
    const startDate = status?.startDateStruct?.date || study.StartDate || '';
    const completionDate = status?.completionDateStruct?.date || study.CompletionDate || '';

    // Primary outcomes
    const primaryOutcomes = (outcomes?.primaryOutcomes || [])
      .slice(0, 3)
      .map(o => o.measure || o.PrimaryOutcomeMeasure || '');

    // Interventions
    const interventionsList = (proto?.armsInterventionsModule?.interventions || [])
      .slice(0, 4)
      .map(i => `${i.type || ''}: ${i.name || ''}`.trim());

    return {
      id: `trial_${nctId}`,
      nctId,
      title: title.trim(),
      status: overallStatus,
      phase,
      summary: briefSummary.slice(0, 500),
      eligibility: {
        criteria: eligibilityCriteria.slice(0, 800),
        minAge,
        maxAge,
        sex,
        healthyVolunteers,
      },
      locations,
      contact: contactInfo,
      sponsor: sponsorName,
      startDate,
      completionDate,
      primaryOutcomes,
      interventions: interventionsList,
      url: `https://clinicaltrials.gov/study/${nctId}`,
      source: 'ClinicalTrials.gov',
    };
  } catch (err) {
    logger.warn(`Trial parse error: ${err.message}`);
    return null;
  }
}

/**
 * Score trial relevance
 */
function scoreTrialRelevance(trial, queryComponents) {
  let score = 0;
  const { disease, intent } = queryComponents;
  const diseaseLower = (disease || '').toLowerCase();
  const titleLower = trial.title.toLowerCase();
  const summaryLower = trial.summary.toLowerCase();

  // Status scoring
  const statusScores = {
    'RECRUITING': 1.0,
    'NOT_YET_RECRUITING': 0.8,
    'ACTIVE_NOT_RECRUITING': 0.6,
    'COMPLETED': 0.4,
    'TERMINATED': 0.1,
    'WITHDRAWN': 0.0,
  };
  score += (statusScores[trial.status] || 0.2) * 0.3;

  // Title relevance
  if (titleLower.includes(diseaseLower)) score += 0.3;
  else if (summaryLower.includes(diseaseLower)) score += 0.1;

  // Phase scoring
  const phaseScores = { '3': 0.3, '4': 0.3, '2': 0.2, '2/3': 0.25, '1': 0.1 };
  for (const [phase, ps] of Object.entries(phaseScores)) {
    if ((trial.phase || '').includes(phase)) { score += ps; break; }
  }

  // Intent alignment
  if (intent === 'treatment' && titleLower.includes('treatment')) score += 0.1;
  if (intent === 'clinical_trial') score += 0.1;

  return Math.min(1.0, score);
}

/**
 * Main clinical trials retrieval
 */
async function retrieveFromClinicalTrials(queryComponents, maxResults = MAX_TRIALS) {
  logger.info(`Starting ClinicalTrials retrieval for: "${queryComponents.disease}"`);

  const { clinicalTrials: ctQuery } = queryComponents.searchQueries || {};
  const condition = ctQuery?.condition || queryComponents.disease;
  const intervention = ctQuery?.intervention || '';
  const location = ctQuery?.location || queryComponents.location || '';

  const rawStudies = await fetchTrials({ condition, intervention, location, maxResults });
  logger.info(`ClinicalTrials raw results: ${rawStudies.length}`);

  const parsed = rawStudies
    .map(parseTrial)
    .filter(Boolean)
    .map(trial => ({
      ...trial,
      relevanceScore: scoreTrialRelevance(trial, queryComponents),
    }))
    .sort((a, b) => b.relevanceScore - a.relevanceScore);

  logger.info(`ClinicalTrials parsed: ${parsed.length} trials`);
  return parsed;
}

module.exports = { retrieveFromClinicalTrials };
