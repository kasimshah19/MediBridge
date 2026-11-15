import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { useDropzone } from 'react-dropzone';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import toast from 'react-hot-toast';
import {
  Building2,
  MapPin,
  FileText,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Eye,
  Trash2,
  UploadCloud,
  ArrowRight,
  ArrowLeft,
  Navigation,
  Search,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Input from '../../components/ui/Input';
import Spinner from '../../components/ui/Spinner';
import Stepper from '../../components/ui/Stepper';
import Modal from '../../components/ui/Modal';
import { useAuth } from '../../context/AuthContext';
import {
  getMyOrganization,
  createOrganization,
  updateMyOrganization,
  uploadDocument,
  deleteDocument,
  getDocumentBlob,
  submitOrganization,
} from '../../api/organization.api';
import { searchGeocode, reverseGeocode } from '../../api/geocode.api';
import { useDebounce } from '../../hooks/useDebounce';
import '../../utils/leafletSetup';
import { OSM_ATTRIBUTION } from '../../utils/leafletSetup';

const SERVICES_OPTIONS = [
  { id: 'general_medicine', label: 'General Medicine' },
  { id: 'pediatrics', label: 'Pediatrics' },
  { id: 'chronic_care', label: 'Chronic Disease Care' },
  { id: 'elderly_care', label: 'Elderly & Geriatric Care' },
  { id: 'maternal_health', label: 'Maternal Health' },
  { id: 'other', label: 'Other Specialized Care' },
];

const DOC_TYPES = [
  { id: 'registration_certificate', label: 'Registration Certificate (Mandatory)' },
  { id: 'id_proof', label: 'Authorized Signatory ID Proof (Mandatory)' },
  { id: 'clinic_license', label: 'Clinic / Facility License (Clinics Only)' },
  { id: 'tax_exemption_12a_80g', label: '12A & 80G Exemption Certificate (Optional)' },
  { id: 'other', label: 'Other Official Document' },
];

// Helper Leaflet component to handle draggable marker and map clicks
function DraggablePin({ position, onMove }) {
  const markerRef = useRef(null);

  useMapEvents({
    click(e) {
      onMove([e.latlng.lat, e.latlng.lng]);
    },
  });

  return (
    <Marker
      draggable
      position={position}
      ref={markerRef}
      eventHandlers={{
        dragend() {
          const marker = markerRef.current;
          if (marker != null) {
            const latlng = marker.getLatLng();
            onMove([latlng.lat, latlng.lng]);
          }
        },
      }}
    />
  );
}

export default function NgoOnboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [org, setOrg] = useState(null);
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [forceEdit, setForceEdit] = useState(false);

  // Search & Geocoding State
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 600);
  const [searchResults, setSearchResults] = useState([]);
  const [searchingLocation, setSearchingLocation] = useState(false);

  // Map Coordinates: [lat, lng]
  const [coords, setCoords] = useState([19.076, 72.8777]); // Default Mumbai center
  const [locationPristine, setLocationPristine] = useState(true);

  // Documents state
  const [selectedDocType, setSelectedDocType] = useState('registration_certificate');
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Step 4 Consent
  const [consentGiven, setConsentGiven] = useState(false);
  const [confirmSubmitModal, setConfirmSubmitModal] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      type: 'ngo',
      name: '',
      registrationNumber: '',
      contactPerson: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      address: '',
      city: user?.city || '',
      state: user?.state || '',
      pincode: '',
      description: '',
      website: '',
      servicesOffered: ['general_medicine'],
      beneficiariesPerMonth: 100,
      operatingHours: 'Monday - Saturday: 9:00 AM - 6:00 PM',
    },
  });

  const selectedType = watch('type');
  const selectedServices = watch('servicesOffered') || [];
  const descriptionValue = watch('description') || '';

  // 1. Fetch existing organization status on load
  const loadOrganization = async () => {
    setLoading(true);
    try {
      const res = await getMyOrganization();
      if (res?.success && res.data.organization) {
        const o = res.data.organization;
        setOrg(o);

        // Populate form fields
        setValue('type', o.type);
        setValue('name', o.name);
        setValue('registrationNumber', o.registrationNumber);
        setValue('contactPerson', o.contactPerson);
        setValue('email', o.email);
        setValue('phone', o.phone);
        setValue('address', o.address);
        setValue('city', o.city);
        setValue('state', o.state);
        setValue('pincode', o.pincode);
        setValue('description', o.description || '');
        setValue('website', o.website || '');
        setValue('servicesOffered', o.servicesOffered || []);
        setValue('beneficiariesPerMonth', o.beneficiariesPerMonth || 0);
        setValue('operatingHours', o.operatingHours || '');

        if (o.location?.coordinates && o.location.coordinates[0] !== 0) {
          setCoords([o.location.coordinates[1], o.location.coordinates[0]]);
          setLocationPristine(false);
        }

        // If verified, redirect to NGO dashboard
        if (o.verificationStatus === 'verified') {
          navigate('/ngo/dashboard', { replace: true });
        }
      }
    } catch {
      // 404 means no organization created yet, stay in Step 1
      setOrg(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrganization();
  }, []);

  // 2. Debounced search geocode
  useEffect(() => {
    const doSearch = async () => {
      if (debouncedSearch && debouncedSearch.trim().length >= 3) {
        setSearchingLocation(true);
        try {
          const res = await searchGeocode(debouncedSearch);
          if (res?.success) {
            setSearchResults(res.data.results || []);
          }
        } catch {
          setSearchResults([]);
        } finally {
          setSearchingLocation(false);
        }
      } else {
        setSearchResults([]);
      }
    };
    doSearch();
  }, [debouncedSearch]);

  // Handle address auto-fill on marker move
  const handleMarkerMove = async ([newLat, newLng]) => {
    setCoords([newLat, newLng]);
    setLocationPristine(false);
    try {
      const res = await reverseGeocode(newLat, newLng);
      if (res?.success && res.data.location) {
        const loc = res.data.location;
        if (loc.city) setValue('city', loc.city);
        if (loc.state) setValue('state', loc.state);
        if (loc.pincode) setValue('pincode', loc.pincode);
        if (loc.label) {
          setValue('address', loc.label.split(',').slice(0, 3).join(',').trim());
        }
        toast.success(`Location updated: ${loc.city || 'Coordinates saved'}`);
      }
    } catch {
      // Fallback silently if Nominatim reverse fails
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser.');
      return;
    }
    toast.loading('Detecting your location...', { id: 'geo' });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        toast.dismiss('geo');
        handleMarkerMove([pos.coords.latitude, pos.coords.longitude]);
      },
      () => {
        toast.dismiss('geo');
        toast.error('Location permission was denied. Please select your pin manually on the map.');
      },
      { timeout: 8000 }
    );
  };

  const handleSelectSearchResult = (item) => {
    handleMarkerMove([item.lat, item.lng]);
    if (item.city) setValue('city', item.city);
    if (item.state) setValue('state', item.state);
    if (item.pincode) setValue('pincode', item.pincode);
    if (item.label) setValue('address', item.label.split(',').slice(0, 3).join(',').trim());
    setSearchResults([]);
    setSearchQuery('');
  };

  // Toggle services chip
  const toggleService = (id) => {
    const current = [...selectedServices];
    const index = current.indexOf(id);
    if (index > -1) {
      current.splice(index, 1);
    } else {
      current.push(id);
    }
    setValue('servicesOffered', current);
  };

  // Autosave Step 1 / Step 2
  const saveDraft = async (data) => {
    const payload = {
      ...data,
      location: {
        lat: coords[0],
        lng: coords[1],
      },
    };

    if (!org) {
      const res = await createOrganization(payload);
      setOrg(res.data.organization);
      toast.success('Organization draft created.');
      return res.data.organization;
    } else {
      const res = await updateMyOrganization(payload);
      setOrg(res.data.organization);
      toast.success('Draft saved successfully.');
      return res.data.organization;
    }
  };

  const handleNextStep = async () => {
    if (step === 1) {
      handleSubmit(async (data) => {
        try {
          await saveDraft(data);
          setStep(2);
        } catch (err) {
          toast.error(err.response?.data?.message || 'Failed to save organization details.');
        }
      })();
    } else if (step === 2) {
      // Validate map coordinates inside India
      if (coords[0] < 6 || coords[0] > 38 || coords[1] < 68 || coords[1] > 98) {
        toast.error('Location pin must be placed within India.');
        return;
      }
      handleSubmit(async (data) => {
        try {
          await saveDraft(data);
          setStep(3);
        } catch (err) {
          toast.error(err.response?.data?.message || 'Failed to save location details.');
        }
      })();
    } else if (step === 3) {
      // Validate mandatory documents
      const docTypes = (org?.documents || []).map((d) => d.type);
      const hasReg = docTypes.includes('registration_certificate');
      const hasId = docTypes.includes('id_proof');

      if (!hasReg || !hasId) {
        toast.error('Please upload both Registration Certificate and ID Proof to continue.');
        return;
      }

      if (selectedType === 'charitable_clinic' && !docTypes.includes('clinic_license')) {
        toast.error('Charitable Clinics must upload a valid Clinic / Facility License.');
        return;
      }

      setStep(4);
    }
  };

  // Dropzone setup
  const onDrop = async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;
    const file = acceptedFiles[0];

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File exceeds maximum allowed size of 5MB.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', selectedDocType);

    setUploadingDoc(true);
    setUploadProgress(10);
    try {
      const res = await uploadDocument(formData, (percent) => setUploadProgress(percent));
      toast.success('Document uploaded successfully.');
      // Refresh organization documents list
      const updatedOrg = await getMyOrganization();
      setOrg(updatedOrg.data.organization);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Document upload failed.');
    } finally {
      setUploadingDoc(false);
      setUploadProgress(0);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
    },
    maxFiles: 1,
    disabled: uploadingDoc,
  });

  const handleDeleteDoc = async (docId) => {
    try {
      await deleteDocument(docId);
      toast.success('Document removed.');
      const updatedOrg = await getMyOrganization();
      setOrg(updatedOrg.data.organization);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete document.');
    }
  };

  const handleViewDoc = async (docId) => {
    try {
      const blob = await getDocumentBlob(org._id, docId);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to open document.');
    }
  };

  // Final submit
  const handleFinalSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await submitOrganization();
      toast.success('Organization submitted for review!');
      setConfirmSubmitModal(false);
      setOrg(res.data.organization);
      setForceEdit(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <Spinner size="lg" />
        <p className="text-xs text-text-muted">Loading organization profile...</p>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // STATUS PAGE (WHEN STATUS IS PENDING OR REJECTED WITHOUT FORCE-EDIT)
  // ─────────────────────────────────────────────────────────────
  if (org && (org.verificationStatus === 'pending' || (org.verificationStatus === 'rejected' && !forceEdit))) {
    const isPending = org.verificationStatus === 'pending';
    const isRejected = org.verificationStatus === 'rejected';

    return (
      <div className="max-w-2xl mx-auto py-10 space-y-8">
        <Card className="p-8 sm:p-10 space-y-6 text-center border-teal-900/10 shadow-soft">
          <div className="w-16 h-16 rounded-3xl mx-auto flex items-center justify-center shadow-soft">
            {isPending ? (
              <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock size={32} />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-3xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <XCircle size={32} />
              </div>
            )}
          </div>

          <div>
            <Badge color={isPending ? 'warning' : 'danger'} className="mb-2">
              {isPending ? 'Verification Under Review' : 'Action Required / Rejected'}
            </Badge>
            <h1 className="text-2xl font-bold text-text-heading">{org.name}</h1>
            <p className="text-xs text-text-muted mt-1">Registration No: {org.registrationNumber}</p>
          </div>

          {isPending && (
            <p className="text-xs sm:text-sm text-text-body max-w-md mx-auto leading-relaxed">
              Your documentation is currently under review by our compliance team. Reviews are typically completed within <strong>24 to 48 hours</strong>. You will receive an automated email notification once verified.
            </p>
          )}

          {isRejected && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-left text-xs text-rose-900 leading-relaxed">
                <p className="font-bold flex items-center gap-1.5 mb-1 text-rose-800">
                  <AlertCircle size={15} />
                  Administrator Feedback:
                </p>
                <p>{org.verificationNote || 'Please update your uploaded documents and resubmit.'}</p>
              </div>
              <Button
                variant="primary"
                onClick={() => {
                  setForceEdit(true);
                  setStep(1);
                }}
              >
                Edit Details & Resubmit Application
              </Button>
            </div>
          )}

          {/* Timeline */}
          <div className="border-t border-slate-100 pt-6 text-left space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-text-heading">Application Timeline</h4>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-teal-600 mt-1" />
                <div className="text-xs">
                  <p className="font-bold text-text-heading">Application Submitted</p>
                  <p className="text-text-muted">
                    {org.submittedAt ? new Date(org.submittedAt).toLocaleString() : 'Recently'}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div
                  className={`w-2.5 h-2.5 rounded-full mt-1 ${
                    isPending ? 'bg-amber-500 animate-pulse' : isRejected ? 'bg-rose-500' : 'bg-slate-300'
                  }`}
                />
                <div className="text-xs">
                  <p className="font-bold text-text-heading">
                    {isPending ? 'Under Compliance Review' : 'Review Completed'}
                  </p>
                  <p className="text-text-muted">
                    {org.reviewHistory && org.reviewHistory.length > 0
                      ? new Date(org.reviewHistory[org.reviewHistory.length - 1].at).toLocaleString()
                      : 'Pending admin review'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 4-STEP WIZARD (DRAFT OR REJECTED IN EDIT MODE)
  // ─────────────────────────────────────────────────────────────
  const wizardSteps = [
    { id: 1, title: 'Org Details' },
    { id: 2, title: 'Map Location' },
    { id: 3, title: 'Documents' },
    { id: 4, title: 'Review & Submit' },
  ];

  return (
    <div className="max-w-3xl mx-auto py-6 sm:py-10 space-y-8">
      {/* Stepper Header */}
      <div className="text-center space-y-2">
        <Badge color="info">Partner Onboarding Wizard</Badge>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-text-heading">
          Register Your Healthcare Organization
        </h1>
        <p className="text-xs sm:text-sm text-text-muted">
          Provide your organization information and official verification documents.
        </p>
      </div>

      <Stepper steps={wizardSteps} currentStep={step} onStepClick={(s) => setStep(s)} />

      {/* STEP 1: ORGANIZATION DETAILS */}
      {step === 1 && (
        <Card className="p-6 sm:p-8 space-y-6">
          <div>
            <h3 className="text-lg font-bold text-text-heading">Step 1: Organization Details</h3>
            <p className="text-xs text-text-muted mt-0.5">Tell us about your healthcare institution and focus.</p>
          </div>

          <form className="space-y-5">
            {/* Type selector cards */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-text-heading mb-2">
                Organization Category *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setValue('type', 'ngo')}
                  className={`p-4 rounded-2xl border text-left transition-all ${
                    selectedType === 'ngo'
                      ? 'border-teal-600 bg-teal-50/50 shadow-soft ring-2 ring-teal-200'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <p className="text-sm font-bold text-teal-900">Registered NGO</p>
                  <p className="text-xs text-text-muted mt-1">
                    Charitable trust or society distributing medicines to community patients.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setValue('type', 'charitable_clinic')}
                  className={`p-4 rounded-2xl border text-left transition-all ${
                    selectedType === 'charitable_clinic'
                      ? 'border-teal-600 bg-teal-50/50 shadow-soft ring-2 ring-teal-200'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <p className="text-sm font-bold text-teal-900">Charitable Clinic / Dispensary</p>
                  <p className="text-xs text-text-muted mt-1">
                    Registered non-profit medical clinic with licensed practitioner supervision.
                  </p>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Organization Legal Name *"
                placeholder="e.g. Hope Community Health Trust"
                {...register('name', { required: 'Organization name is required' })}
                error={errors.name?.message}
              />
              <Input
                label="Registration / Trust Deed No. *"
                placeholder="e.g. TRUST-MH-2023-99182"
                {...register('registrationNumber', { required: 'Registration number is required' })}
                error={errors.registrationNumber?.message}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Authorized Contact Person *"
                placeholder="Full Name"
                {...register('contactPerson', { required: 'Contact person is required' })}
                error={errors.contactPerson?.message}
              />
              <Input
                label="Official Email *"
                type="email"
                placeholder="contact@org.org"
                {...register('email', { required: 'Official email is required' })}
                error={errors.email?.message}
              />
              <Input
                label="Official Phone *"
                placeholder="10-digit number"
                {...register('phone', { required: 'Phone number is required' })}
                error={errors.phone?.message}
              />
            </div>

            {/* Description with character counter */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-text-heading">
                  About Organization & Mission
                </label>
                <span className="text-[10px] text-text-muted">{descriptionValue.length} / 500</span>
              </div>
              <textarea
                rows={3}
                maxLength={500}
                {...register('description')}
                placeholder="Briefly describe your patient community and healthcare programs..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-text-heading placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-teal-400/50 focus:border-teal-500"
              />
            </div>

            {/* Services Offered Multi-Select */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-text-heading mb-2">
                Services Offered (Select all applicable)
              </label>
              <div className="flex flex-wrap gap-2">
                {SERVICES_OPTIONS.map((srv) => {
                  const selected = selectedServices.includes(srv.id);
                  return (
                    <button
                      key={srv.id}
                      type="button"
                      onClick={() => toggleService(srv.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                        selected
                          ? 'bg-teal-600 text-white shadow-soft'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {srv.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Estimated Monthly Beneficiaries"
                type="number"
                placeholder="e.g. 250"
                {...register('beneficiariesPerMonth')}
              />
              <Input
                label="Website URL (Optional)"
                placeholder="https://yourorganization.org"
                {...register('website')}
              />
            </div>

            <div className="flex justify-end pt-4">
              <Button variant="primary" onClick={handleNextStep}>
                Next: Map Location
                <ArrowRight size={16} className="ml-1.5" />
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* STEP 2: LOCATION & LEAFLET MAP */}
      {step === 2 && (
        <Card className="p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-text-heading">Step 2: Location & Service Center Pin</h3>
              <p className="text-xs text-text-muted mt-0.5">
                Pin your clinic on the map for accurate proximity-based donation matching.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleUseCurrentLocation}>
              <Navigation size={14} className="mr-1.5 text-teal-600" />
              Use My Current Location
            </Button>
          </div>

          {/* Search Box with Suggestions Dropdown */}
          <div className="relative">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search location (e.g. Bandra West, Mumbai or pincode)..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400/50 focus:border-teal-500"
              />
              {searchingLocation && (
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                  <Spinner size="sm" />
                </div>
              )}
            </div>

            {searchResults.length > 0 && (
              <div className="absolute z-30 mt-1 w-full bg-white rounded-2xl shadow-xl border border-slate-200 max-h-60 overflow-y-auto p-1.5 space-y-1">
                {searchResults.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectSearchResult(item)}
                    className="w-full px-3 py-2 text-left text-xs hover:bg-teal-50 rounded-xl text-text-heading flex items-start gap-2 transition-colors"
                  >
                    <MapPin size={14} className="text-teal-600 flex-shrink-0 mt-0.5" />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Leaflet Map */}
          <div className="rounded-2xl overflow-hidden border border-slate-200 h-72 sm:h-80 relative z-10 shadow-inner">
            <MapContainer
              center={coords}
              zoom={13}
              scrollWheelZoom={false}
              className="h-full w-full"
            >
              <TileLayer
                attribution={OSM_ATTRIBUTION}
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <DraggablePin position={coords} onMove={handleMarkerMove} />
            </MapContainer>
          </div>

          <p className="text-[11px] text-text-muted flex items-center gap-1.5">
            <MapPin size={13} className="text-teal-600" />
            <span>Drag the marker or click on the map to position your facility accurately.</span>
          </p>

          {/* Address Fields */}
          <div className="space-y-4 pt-2">
            <Input
              label="Street Address *"
              placeholder="Building, street, landmark"
              {...register('address', { required: 'Street address is required' })}
              error={errors.address?.message}
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="City *"
                placeholder="City"
                {...register('city', { required: 'City is required' })}
                error={errors.city?.message}
              />
              <Input
                label="State *"
                placeholder="State"
                {...register('state', { required: 'State is required' })}
                error={errors.state?.message}
              />
              <Input
                label="Pincode (6 digits) *"
                placeholder="400050"
                {...register('pincode', { required: 'Pincode is required' })}
                error={errors.pincode?.message}
              />
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-100">
            <Button variant="ghost" onClick={() => setStep(1)}>
              <ArrowLeft size={16} className="mr-1.5" />
              Back
            </Button>
            <Button variant="primary" onClick={handleNextStep}>
              Next: Documents
              <ArrowRight size={16} className="ml-1.5" />
            </Button>
          </div>
        </Card>
      )}

      {/* STEP 3: OFFICIAL DOCUMENTS */}
      {step === 3 && (
        <Card className="p-6 sm:p-8 space-y-6">
          <div>
            <h3 className="text-lg font-bold text-text-heading">Step 3: Verification Documents</h3>
            <p className="text-xs text-text-muted mt-0.5">
              Upload scanned documents in PDF, JPG, or PNG (Max 5MB each, up to 6 documents).
            </p>
          </div>

          {/* Document Type Selector & Dropzone */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-text-heading mb-1.5">
                Select Document Type Before Uploading
              </label>
              <select
                value={selectedDocType}
                onChange={(e) => setSelectedDocType(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white text-text-heading focus:outline-none focus:ring-2 focus:ring-teal-400"
              >
                {DOC_TYPES.filter(
                  (d) => d.id !== 'clinic_license' || selectedType === 'charitable_clinic'
                ).map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Dropzone Box */}
            <div
              {...getRootProps()}
              className={`p-8 rounded-2xl border-2 border-dashed text-center transition-all cursor-pointer ${
                isDragActive
                  ? 'border-teal-500 bg-teal-50/60'
                  : 'border-slate-200 hover:border-teal-400 bg-slate-50/50'
              }`}
            >
              <input {...getInputProps()} />
              <UploadCloud className="w-10 h-10 text-teal-600 mx-auto mb-2" />
              <p className="text-sm font-bold text-text-heading">
                {isDragActive ? 'Drop file here' : 'Click to select or drag and drop document'}
              </p>
              <p className="text-xs text-text-muted mt-1">Accepted: PDF, JPG, PNG (Max 5MB)</p>
            </div>

            {uploadingDoc && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-text-muted">
                  <span>Uploading document...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-teal-600 transition-all duration-200"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Uploaded Documents List */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-text-heading">
              Uploaded Documents ({org?.documents?.length || 0} / 6)
            </h4>

            {(!org?.documents || org.documents.length === 0) ? (
              <p className="text-xs text-amber-800 bg-amber-50 p-3 rounded-xl border border-amber-200">
                No documents uploaded yet. You must upload at least a <strong>Registration Certificate</strong> and an <strong>ID Proof</strong>.
              </p>
            ) : (
              <div className="space-y-2">
                {org.documents.map((doc) => (
                  <div
                    key={doc._id}
                    className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-white shadow-soft"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
                        <FileText size={18} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-text-heading">{doc.originalName}</p>
                        <p className="text-[10px] text-text-muted capitalize">
                          {doc.type.replace(/_/g, ' ')} • {(doc.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDoc(doc._id)}
                        className="text-teal-700 hover:text-teal-900"
                      >
                        <Eye size={14} className="mr-1" />
                        View
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteDoc(doc._id)}
                        className="text-rose-600 hover:text-rose-800"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-100">
            <Button variant="ghost" onClick={() => setStep(2)}>
              <ArrowLeft size={16} className="mr-1.5" />
              Back
            </Button>
            <Button variant="primary" onClick={handleNextStep}>
              Next: Review & Submit
              <ArrowRight size={16} className="ml-1.5" />
            </Button>
          </div>
        </Card>
      )}

      {/* STEP 4: REVIEW AND SUBMIT */}
      {step === 4 && (
        <Card className="p-6 sm:p-8 space-y-6">
          <div>
            <h3 className="text-lg font-bold text-text-heading">Step 4: Review Application Summary</h3>
            <p className="text-xs text-text-muted mt-0.5">
              Verify all details before submitting for official compliance review.
            </p>
          </div>

          {/* Review Sections */}
          <div className="space-y-4">
            {/* 1. Details summary */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold uppercase tracking-wider text-text-heading">
                  1. Organization Profile
                </span>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs text-teal-700 font-semibold hover:underline"
                >
                  Edit
                </button>
              </div>
              <div className="text-xs text-text-body space-y-1">
                <p><strong>Name:</strong> {org?.name}</p>
                <p><strong>Category:</strong> {org?.type?.replace('_', ' ').toUpperCase()}</p>
                <p><strong>Reg No:</strong> {org?.registrationNumber}</p>
                <p><strong>Contact:</strong> {org?.contactPerson} ({org?.email}, {org?.phone})</p>
                <p><strong>Services:</strong> {org?.servicesOffered?.join(', ')}</p>
              </div>
            </div>

            {/* 2. Location summary */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold uppercase tracking-wider text-text-heading">
                  2. Facility Location
                </span>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="text-xs text-teal-700 font-semibold hover:underline"
                >
                  Edit
                </button>
              </div>
              <div className="text-xs text-text-body space-y-1">
                <p><strong>Address:</strong> {org?.address}, {org?.city}, {org?.state} - {org?.pincode}</p>
                <p className="text-[10px] text-text-muted">
                  Coordinates: {coords[0].toFixed(4)}°N, {coords[1].toFixed(4)}°E
                </p>
              </div>
            </div>

            {/* 3. Documents summary */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold uppercase tracking-wider text-text-heading">
                  3. Uploaded Documents ({org?.documents?.length || 0})
                </span>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="text-xs text-teal-700 font-semibold hover:underline"
                >
                  Edit
                </button>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {org?.documents?.map((doc) => (
                  <Badge key={doc._id} color="success" className="capitalize text-[10px]">
                    ✓ {doc.type.replace(/_/g, ' ')}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Genuine Consent Checkbox */}
          <div className="p-4 rounded-xl bg-teal-50/70 border border-teal-200 flex items-start gap-3">
            <input
              type="checkbox"
              id="consent"
              checked={consentGiven}
              onChange={(e) => setConsentGiven(e.target.checked)}
              className="mt-0.5 rounded text-teal-600 focus:ring-teal-500 w-4 h-4 cursor-pointer"
            />
            <label htmlFor="consent" className="text-xs text-teal-900 leading-relaxed cursor-pointer">
              I solemnly confirm that all submitted organization details and uploaded documents are genuine, authentic, and represent an active non-profit medical entity.
            </label>
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-100">
            <Button variant="ghost" onClick={() => setStep(3)}>
              <ArrowLeft size={16} className="mr-1.5" />
              Back
            </Button>
            <Button
              variant="primary"
              disabled={!consentGiven}
              onClick={() => setConfirmSubmitModal(true)}
            >
              Submit Application For Review
            </Button>
          </div>
        </Card>
      )}

      {/* Confirmation Modal */}
      <Modal
        isOpen={confirmSubmitModal}
        onClose={() => setConfirmSubmitModal(false)}
        title="Submit Verification Application"
      >
        <div className="space-y-4">
          <p className="text-xs sm:text-sm text-text-body leading-relaxed">
            Are you sure you want to submit <strong>{org?.name}</strong> for administrative review? Once submitted, your organization profile will remain locked until the review is completed.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setConfirmSubmitModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" loading={submitting} onClick={handleFinalSubmit}>
              Confirm & Submit
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

