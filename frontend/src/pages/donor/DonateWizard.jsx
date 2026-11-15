import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import {
  Pill,
  Camera,
  MapPin,
  CheckSquare,
  Plus,
  Trash2,
  Copy,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  ArrowLeft,
  UploadCloud,
  Eye,
  Info,
  ShieldCheck,
  Check,
  RotateCcw,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Input from '../../components/ui/Input';
import Spinner from '../../components/ui/Spinner';
import Stepper from '../../components/ui/Stepper';
import Modal from '../../components/ui/Modal';
import MonthYearPicker from '../../components/ui/MonthYearPicker';
import LocationPicker from '../../components/common/LocationPicker';
import Lightbox from '../../components/ui/Lightbox';
import { useAuth } from '../../context/AuthContext';
import {
  createDraftDonation,
  getDonationById,
  updateDraftDonation,
  uploadItemPhoto,
  deleteItemPhoto,
  getItemPhotoBlob,
  submitDonation,
} from '../../api/donation.api';
import { getPublicConfig } from '../../api/public.api';

const MEDICINE_TYPES = [
  { id: 'tablet', label: 'Tablet' },
  { id: 'capsule', label: 'Capsule' },
  { id: 'syrup', label: 'Syrup / Liquid' },
  { id: 'ointment', label: 'Ointment / Gel' },
  { id: 'drops', label: 'Drops (Eye/Ear)' },
  { id: 'inhaler', label: 'Inhaler / Resp.' },
  { id: 'powder', label: 'Powder' },
  { id: 'injection', label: 'Injection (Non-accepted)' },
  { id: 'other', label: 'Other Form' },
];

const PACKAGING_CONDITIONS = [
  {
    id: 'sealed',
    label: 'Sealed & Intact',
    desc: 'Unbroken blister strip or untampered bottle seal',
    accepted: true,
  },
  {
    id: 'opened',
    label: 'Opened / Partially Used',
    desc: 'Broken seal or used portions from strip/bottle',
    accepted: false,
  },
  {
    id: 'damaged',
    label: 'Damaged Packaging',
    desc: 'Torn foil, crushed packaging, or illegible details',
    accepted: false,
  },
  {
    id: 'loose_tablets',
    label: 'Loose Tablets / Cut Strips',
    desc: 'Tablets separated from identifiable blister packs',
    accepted: false,
  },
];

const STORAGE_CONDITIONS = [
  { id: 'room_temperature', label: 'Room Temperature (Clean & Dry, <25°C)' },
  { id: 'refrigerated', label: 'Refrigerated (2°C - 8°C, Cold Chain)' },
  { id: 'unknown', label: 'Unknown or Unmonitored Storage' },
  { id: 'exposed_heat_or_moisture', label: 'Exposed to Heat, Direct Sun, or Dampness' },
];

const MEDICINE_UNITS = [
  { id: 'strip', label: 'Strip(s)' },
  { id: 'box', label: 'Box(es)' },
  { id: 'bottle', label: 'Bottle(s)' },
  { id: 'tube', label: 'Tube(s)' },
  { id: 'pack', label: 'Pack(s)' },
  { id: 'vial', label: 'Vial(s)' },
];

const COLD_CHAIN_KEYWORDS = [
  'insulin',
  'vaccine',
  'vaccin',
  'interferon',
  'heparin',
  'erythropoietin',
  'filgrastim',
  'botox',
];

const CONTROLLED_KEYWORDS = [
  'morphine',
  'codeine',
  'fentanyl',
  'tramadol',
  'alprazolam',
  'diazepam',
  'clonazepam',
  'zolpidem',
  'methadone',
  'buprenorphine',
  'phenobarbital',
  'lorazepam',
];

function createDefaultItem() {
  return {
    _tempId: `item_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    _id: undefined,
    name: '',
    genericName: '',
    manufacturer: '',
    batchNumber: '',
    expiryDate: '',
    manufacturingDate: '',
    quantity: 1,
    unit: 'strip',
    unitsPerPack: '',
    medicineType: 'tablet',
    packagingCondition: 'sealed',
    storageCondition: 'room_temperature',
    storageHistory: '',
    isPrescriptionOnly: false,
    photos: [],
  };
}

export default function DonateWizard() {
  const { id: draftIdFromUrl } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [activeStep, setActiveStep] = useState(0);
  const [draftId, setDraftId] = useState(draftIdFromUrl || null);
  const [loading, setLoading] = useState(Boolean(draftIdFromUrl));
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Policy configuration from server
  const [config, setConfig] = useState({
    minShelfLifeDays: 90,
    maxItems: 10,
    maxPhotos: 4,
  });

  // Step 1: Medicines list
  const [items, setItems] = useState([createDefaultItem()]);
  const [expandedIndex, setExpandedIndex] = useState(0);

  // Step 2: Photos metadata and local blob cache
  // itemPhotosMap: { [itemId]: [{ _id, originalName, size, blobUrl, uploading }] }
  const [photoBlobMap, setPhotoBlobMap] = useState({});

  // Step 3: Pickup & Contact
  const [pickupAddress, setPickupAddress] = useState({
    line1: user?.address || '',
    city: user?.city || '',
    state: user?.state || '',
    pincode: '',
  });
  const [location, setLocation] = useState(null);
  const [contactPhone, setContactPhone] = useState(user?.phone || '');
  const [preferredTimeSlot, setPreferredTimeSlot] = useState('Anytime (9 AM - 6 PM)');
  const [notes, setNotes] = useState('');

  // Step 4: Declarations & Submit
  const [declarations, setDeclarations] = useState({
    sealedAndUnused: false,
    storedProperly: false,
    notControlled: false,
    genuineInfo: false,
  });
  const [submitConfirmOpen, setSubmitConfirmOpen] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);

  // Lightbox preview state
  const [lightboxState, setLightboxState] = useState({ isOpen: false, src: '', title: '' });

  // 1. Fetch public platform policy config
  useEffect(() => {
    getPublicConfig()
      .then((res) => {
        if (res?.data) {
          setConfig({
            minShelfLifeDays: res.data.minShelfLifeDays || 90,
            maxItems: res.data.maxItems || 10,
            maxPhotos: res.data.maxPhotos || 4,
          });
        }
      })
      .catch(() => {});
  }, []);

  // 2. Load existing draft if resuming
  useEffect(() => {
    if (draftIdFromUrl) {
      setLoading(true);
      getDonationById(draftIdFromUrl)
        .then((res) => {
          const donation = res.data;
          if (donation) {
            setDraftId(donation._id);
            if (donation.items && donation.items.length > 0) {
              setItems(donation.items);
            }
            if (donation.pickupAddress) {
              setPickupAddress(donation.pickupAddress);
            }
            if (donation.location?.coordinates) {
              setLocation({
                lat: donation.location.coordinates[1],
                lng: donation.location.coordinates[0],
              });
            }
            if (donation.contactPhone) setContactPhone(donation.contactPhone);
            if (donation.preferredTimeSlot) setPreferredTimeSlot(donation.preferredTimeSlot);
            if (donation.notes) setNotes(donation.notes);
            if (donation.declarations) setDeclarations(donation.declarations);

            // Fetch blobs for existing photos
            donation.items?.forEach((item) => {
              item.photos?.forEach((p) => {
                getItemPhotoBlob(donation._id, item._id, p._id)
                  .then((blobUrl) => {
                    setPhotoBlobMap((prev) => ({ ...prev, [p._id]: blobUrl }));
                  })
                  .catch(() => {});
              });
            });
          }
        })
        .catch((err) => {
          toast.error(err.response?.data?.message || 'Failed to load draft donation.');
          navigate('/donor/donations');
        })
        .finally(() => setLoading(false));
    }
  }, [draftIdFromUrl, navigate]);

  // Client-side rule warnings helper
  const getClientSideWarnings = (item) => {
    const warnings = [];

    // Expiry check
    if (item.expiryDate) {
      let expiryTime;
      if (/^\d{4}-\d{2}/.test(item.expiryDate)) {
        const [y, m] = item.expiryDate.split('-').map(Number);
        const lastDay = new Date(y, m, 0).getDate();
        expiryTime = new Date(y, m - 1, lastDay, 23, 59, 59).getTime();
      } else {
        expiryTime = new Date(item.expiryDate).getTime();
      }

      const now = Date.now();
      const remainingDays = Math.ceil((expiryTime - now) / (1000 * 60 * 60 * 24));

      if (remainingDays <= 0) {
        warnings.push({
          type: 'danger',
          code: 'EXPIRED',
          text: 'This medicine has expired. Expired medicines cannot be accepted under any circumstance.',
        });
      } else if (remainingDays < config.minShelfLifeDays) {
        warnings.push({
          type: 'danger',
          code: 'SHELF_LIFE_TOO_SHORT',
          text: `Expires in ${remainingDays} days. Minimum remaining shelf life required is ${config.minShelfLifeDays} days.`,
        });
      }
    }

    // Packaging check
    if (item.packagingCondition === 'loose_tablets') {
      warnings.push({
        type: 'danger',
        code: 'LOOSE_TABLETS',
        text: 'Loose tablets or cut strips cannot be accepted due to hygiene and batch traceability rules.',
      });
    } else if (item.packagingCondition === 'opened' || item.packagingCondition === 'damaged') {
      warnings.push({
        type: 'danger',
        code: 'PACKAGING_NOT_SEALED',
        text: 'Only sealed, intact blister strips and untampered original bottles are accepted.',
      });
    }

    // Injection check
    if (item.medicineType === 'injection' || item.unit === 'vial') {
      warnings.push({
        type: 'danger',
        code: 'INJECTION_NOT_ACCEPTED',
        text: 'Injectables and vials cannot be accepted through domestic community donations.',
      });
    }

    // Cold chain check
    const nameStr = `${item.name || ''} ${item.genericName || ''}`.toLowerCase();
    const isColdKeyword = COLD_CHAIN_KEYWORDS.find((k) => nameStr.includes(k));
    if (item.storageCondition === 'refrigerated' || isColdKeyword) {
      warnings.push({
        type: 'danger',
        code: 'COLD_CHAIN_NOT_ACCEPTED',
        text: `Refrigerated items and insulins/vaccines (${isColdKeyword || 'cold chain'}) require unbroken cold chain that cannot be verified.`,
      });
    }

    // Controlled substance check
    const isControlled = CONTROLLED_KEYWORDS.find((k) => nameStr.includes(k));
    if (isControlled) {
      warnings.push({
        type: 'danger',
        code: 'CONTROLLED_SUBSTANCE',
        text: `Controlled/narcotic substance detected (${isControlled}). Strictly restricted under drug control acts.`,
      });
    }

    // Storage condition
    if (item.storageCondition === 'exposed_heat_or_moisture') {
      warnings.push({
        type: 'danger',
        code: 'BAD_STORAGE',
        text: 'Medicines exposed to extreme heat or dampness cannot be safely redistributed.',
      });
    }

    return warnings;
  };

  // Remaining days label helper
  const getShelfLifeChip = (expiryDate) => {
    if (!expiryDate) return null;
    let expiryTime;
    if (/^\d{4}-\d{2}/.test(expiryDate)) {
      const [y, m] = expiryDate.split('-').map(Number);
      const lastDay = new Date(y, m, 0).getDate();
      expiryTime = new Date(y, m - 1, lastDay, 23, 59, 59).getTime();
    } else {
      expiryTime = new Date(expiryDate).getTime();
    }

    const remainingDays = Math.ceil((expiryTime - Date.now()) / (1000 * 60 * 60 * 24));

    if (remainingDays <= 0) {
      return <Badge color="danger">Expired</Badge>;
    }
    if (remainingDays < config.minShelfLifeDays) {
      return <Badge color="danger">{remainingDays}d (Too short)</Badge>;
    }
    if (remainingDays <= 180) {
      return <Badge color="warning">{remainingDays}d remaining</Badge>;
    }
    return <Badge color="success">{remainingDays}d shelf life</Badge>;
  };

  // Item management in Step 1
  const handleAddItem = () => {
    if (items.length >= config.maxItems) {
      toast.error(`Maximum ${config.maxItems} items allowed per donation.`);
      return;
    }
    const newItem = createDefaultItem();
    setItems((prev) => [...prev, newItem]);
    setExpandedIndex(items.length);
  };

  const handleDuplicateItem = (index) => {
    if (items.length >= config.maxItems) {
      toast.error(`Maximum ${config.maxItems} items allowed per donation.`);
      return;
    }
    const target = items[index];
    const duplicated = {
      ...target,
      _id: undefined,
      _tempId: `item_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      batchNumber: '',
      photos: [],
    };
    setItems((prev) => [...prev, duplicated]);
    setExpandedIndex(items.length);
    toast.success('Medicine item duplicated. Please enter the batch number.');
  };

  const handleRemoveItem = (index) => {
    if (items.length <= 1) {
      toast.error('At least 1 medicine item is required.');
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
    if (expandedIndex >= index) {
      setExpandedIndex(Math.max(0, expandedIndex - 1));
    }
  };

  const handleItemFieldChange = (index, field, value) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  // Autosave Draft
  const saveCurrentDraft = async () => {
    // Basic validation of Step 1
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.name?.trim()) {
        toast.error(`Please provide medicine name for item #${i + 1}`);
        setExpandedIndex(i);
        return false;
      }
      if (!item.batchNumber?.trim()) {
        toast.error(`Please enter batch number for "${item.name}"`);
        setExpandedIndex(i);
        return false;
      }
      if (!item.expiryDate) {
        toast.error(`Please select expiry date (MM/YYYY) for "${item.name}"`);
        setExpandedIndex(i);
        return false;
      }
    }

    try {
      setSaving(true);
      const payload = {
        items: items.map((i) => ({
          _id: i._id,
          name: i.name.trim(),
          genericName: i.genericName?.trim() || '',
          manufacturer: i.manufacturer?.trim() || '',
          batchNumber: i.batchNumber.trim().toUpperCase(),
          manufacturingDate: i.manufacturingDate || null,
          expiryDate: i.expiryDate,
          quantity: Number(i.quantity) || 1,
          unit: i.unit,
          unitsPerPack: i.unitsPerPack ? Number(i.unitsPerPack) : null,
          medicineType: i.medicineType,
          packagingCondition: i.packagingCondition,
          storageCondition: i.storageCondition,
          storageHistory: i.storageHistory?.trim() || '',
          isPrescriptionOnly: Boolean(i.isPrescriptionOnly),
        })),
        pickupAddress: {
          line1: pickupAddress.line1?.trim() || 'Address Pending',
          city: pickupAddress.city?.trim() || user?.city || 'Mumbai',
          state: pickupAddress.state?.trim() || user?.state || 'Maharashtra',
          pincode: pickupAddress.pincode?.trim() || '400001',
        },
        location: location || { lat: 19.076, lng: 72.8777 },
        contactPhone: contactPhone?.trim() || user?.phone || '9876543210',
        preferredTimeSlot,
        notes,
      };

      if (!draftId) {
        const res = await createDraftDonation(payload);
        const created = res.data;
        setDraftId(created._id);
        if (created.items) {
          setItems(created.items);
        }
        toast.success('Donation draft autosaved!');
      } else {
        const res = await updateDraftDonation(draftId, payload);
        const updated = res.data;
        if (updated.items) {
          setItems(updated.items);
        }
      }
      return true;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to autosave donation draft.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Step 2: Photo Dropzone Item Uploader
  const handlePhotoUpload = async (itemIndex, file) => {
    const item = items[itemIndex];
    if (!item._id && !draftId) {
      // Must save draft first to obtain IDs
      const saved = await saveCurrentDraft();
      if (!saved) return;
    }

    const currentItemId = items[itemIndex]._id;
    if (!currentItemId || !draftId) {
      toast.error('Please save your medicines before uploading photos.');
      return;
    }

    if ((item.photos || []).length >= config.maxPhotos) {
      toast.error(`Maximum ${config.maxPhotos} photos per medicine.`);
      return;
    }

    try {
      const res = await uploadItemPhoto(draftId, currentItemId, file);
      const newPhoto = res.data;

      // Update state
      setItems((prev) => {
        const copy = [...prev];
        const targetItem = { ...copy[itemIndex] };
        targetItem.photos = [...(targetItem.photos || []), newPhoto];
        copy[itemIndex] = targetItem;
        return copy;
      });

      // Fetch blob URL for preview
      const blobUrl = await getItemPhotoBlob(draftId, currentItemId, newPhoto._id);
      setPhotoBlobMap((prev) => ({ ...prev, [newPhoto._id]: blobUrl }));
      toast.success('Photo uploaded and verified.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload photo.');
    }
  };

  const handlePhotoDelete = async (itemIndex, photoId) => {
    const item = items[itemIndex];
    if (!draftId || !item._id) return;

    try {
      await deleteItemPhoto(draftId, item._id, photoId);
      setItems((prev) => {
        const copy = [...prev];
        const targetItem = { ...copy[itemIndex] };
        targetItem.photos = (targetItem.photos || []).filter((p) => p._id !== photoId);
        copy[itemIndex] = targetItem;
        return copy;
      });
      toast.success('Photo deleted.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete photo.');
    }
  };

  // Step navigation
  const handleNext = async () => {
    if (activeStep === 0) {
      const ok = await saveCurrentDraft();
      if (!ok) return;
      setActiveStep(1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (activeStep === 1) {
      // Validate photos step: require at least 1 photo per item
      const missingPhotos = items.some((i) => !i.photos || i.photos.length === 0);
      if (missingPhotos) {
        toast.error('Each medicine item requires at least 1 clear photograph of the packaging.');
        return;
      }
      setActiveStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (activeStep === 2) {
      // Validate pickup address and location
      if (!pickupAddress.line1?.trim()) {
        toast.error('Please enter pickup street address.');
        return;
      }
      if (!pickupAddress.city?.trim() || !pickupAddress.state?.trim()) {
        toast.error('Please enter city and state.');
        return;
      }
      if (!/^[1-9]\d{5}$/.test(pickupAddress.pincode?.trim())) {
        toast.error('Please enter a valid 6-digit Indian PIN code.');
        return;
      }
      if (!location?.lat || !location?.lng) {
        toast.error('Please set a pickup location pin on the map.');
        return;
      }
      if (!/^[6-9]\d{9}$/.test(contactPhone?.trim())) {
        toast.error('Please enter a valid 10-digit Indian contact phone number.');
        return;
      }

      await saveCurrentDraft();
      setActiveStep(3);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrev = () => {
    setActiveStep((prev) => Math.max(0, prev - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Final Submit
  const handleFinalSubmit = async () => {
    if (
      !declarations.sealedAndUnused ||
      !declarations.storedProperly ||
      !declarations.notControlled ||
      !declarations.genuineInfo
    ) {
      toast.error('You must tick and agree to all four compliance declarations.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await submitDonation(draftId, declarations);
      setSubmitResult(res.data);
      setSubmitConfirmOpen(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Submission failed. Please check item details.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8">
        <Spinner size="lg" />
        <p className="text-xs text-text-muted mt-3 font-semibold">Loading donation details...</p>
      </div>
    );
  }

  // SUBMIT RESULT SCREEN
  if (submitResult) {
    const isScreeningRejected = submitResult.status === 'screening_rejected';
    const passedItems = submitResult.items?.filter((i) => i.screening?.status === 'passed') || [];
    const rejectedItems =
      submitResult.items?.filter((i) => i.screening?.status === 'rejected') || [];

    return (
      <div className="max-w-3xl mx-auto space-y-6 py-6 animate-fade-in">
        <Card className="p-8 text-center bg-white shadow-hover border border-teal-900/10">
          <div className="mb-4 flex justify-center">
            {isScreeningRejected ? (
              <div className="w-20 h-20 rounded-3xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shadow-soft">
                <AlertOctagon size={42} />
              </div>
            ) : (
              <div className="w-20 h-20 rounded-3xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shadow-soft animate-bounce">
                <CheckCircle2 size={42} />
              </div>
            )}
          </div>

          <h2 className="text-2xl sm:text-3xl font-heading font-extrabold text-text-heading">
            {isScreeningRejected ? 'Donation Safety Notice' : 'Donation Submitted Successfully!'}
          </h2>

          <p className="text-xs sm:text-sm text-text-body max-w-lg mx-auto mt-2 leading-relaxed">
            {isScreeningRejected ? (
              <>
                Donation <strong className="font-mono text-rose-800">{submitResult.donationCode}</strong> could not be approved for redistribution. In accordance with safety policies, pharmaceuticals failing automated compliance checks cannot be transferred.
              </>
            ) : (
              <>
                Thank you for your generous contribution! Donation <strong className="font-mono text-teal-800">{submitResult.donationCode}</strong> has passed automated compliance checks and has been queued for physical inspection by a licensed pharmacist.
              </>
            )}
          </p>

          <div className="inline-flex items-center gap-2 mt-4 px-3 py-1.5 rounded-full bg-slate-100 text-xs font-mono font-bold text-slate-800">
            <span>Reference Code: {submitResult.donationCode}</span>
          </div>

          {/* Breakdown of items */}
          <div className="mt-8 text-left space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted">
              Automated Screening Breakdown ({submitResult.items?.length} items)
            </h4>

            <div className="space-y-3">
              {submitResult.items?.map((item, idx) => {
                const passed = item.screening?.status === 'passed';
                return (
                  <div
                    key={item._id || idx}
                    className={`p-4 rounded-2xl border transition-all ${
                      passed
                        ? 'bg-emerald-50/50 border-emerald-200/80'
                        : 'bg-rose-50/50 border-rose-200/80'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-xs text-text-heading">{item.name}</span>
                          <span className="text-[10px] font-mono text-slate-500">
                            ({item.medicineId || `Item #${idx + 1}`})
                          </span>
                        </div>
                        <p className="text-[11px] text-text-muted">
                          Batch: {item.batchNumber} • Expiry: {new Date(item.expiryDate).toLocaleDateString()} • Qty: {item.quantity} {item.unit}
                        </p>
                      </div>

                      <Badge color={passed ? 'success' : 'danger'}>
                        {passed ? 'Screening Passed' : 'Not Accepted'}
                      </Badge>
                    </div>

                    {!passed && item.screening?.reasons && item.screening.reasons.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-rose-200/60 space-y-1">
                        <p className="text-[11px] font-bold text-rose-800">Regulatory Reasons:</p>
                        <ul className="text-[11px] text-rose-700 space-y-1 list-disc pl-5">
                          {item.screening.reasons.map((r, rIdx) => (
                            <li key={rIdx}>{r.message}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action buttons */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to={`/donor/donations/${submitResult._id}`}>
              <Button variant="primary" size="md" className="w-full sm:w-auto text-xs font-bold">
                <span>View Donation Details</span>
                <ArrowRight size={14} className="ml-1.5" />
              </Button>
            </Link>
            <Button
              variant="outline"
              size="md"
              onClick={() => {
                setSubmitResult(null);
                setDraftId(null);
                setItems([createDefaultItem()]);
                setActiveStep(0);
                navigate('/donor/donate');
              }}
              className="w-full sm:w-auto text-xs"
            >
              <RotateCcw size={14} className="mr-1.5" />
              <span>Donate More Medicines</span>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Count items with warnings
  const itemsWithWarningsCount = items.filter(
    (item) => getClientSideWarnings(item).length > 0
  ).length;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Link
            to="/donor/dashboard"
            className="text-xs text-text-muted hover:text-teal-700 transition-colors flex items-center gap-1"
          >
            <span>Dashboard</span>
            <span>/</span>
          </Link>
          <span className="text-xs font-semibold text-text-heading">Donate Medicines</span>
        </div>
        <h1 className="text-2xl font-heading font-extrabold text-text-heading">
          {draftId ? 'Resume Medicine Donation' : 'New Medicine Donation'}
        </h1>
        <p className="text-xs text-text-muted mt-0.5">
          Step-by-step submission with automated safety and shelf-life screening.
        </p>
      </div>

      {/* Stepper Progress */}
      <Stepper
        steps={[
          { title: 'Medicines', description: 'Item details' },
          { title: 'Photos', description: 'Packaging verification' },
          { title: 'Pickup & Map', description: 'Location details' },
          { title: 'Review', description: 'Declarations & submit' },
        ]}
        activeStep={activeStep}
      />

      {/* STEP 1: MEDICINE DETAILS */}
      {activeStep === 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-text-heading">
              Medicine Items ({items.length} of {config.maxItems})
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddItem}
              disabled={items.length >= config.maxItems}
              className="text-xs py-1 px-3"
            >
              <Plus size={13} className="mr-1" />
              <span>Add Another Medicine</span>
            </Button>
          </div>

          <div className="space-y-4">
            {items.map((item, index) => {
              const warnings = getClientSideWarnings(item);
              const isExpanded = expandedIndex === index;

              return (
                <Card
                  key={item._id || item._tempId}
                  className={`overflow-hidden transition-all duration-200 border ${
                    warnings.length > 0 ? 'border-amber-200' : 'border-slate-200'
                  }`}
                >
                  {/* Card Accordion Header */}
                  <div
                    onClick={() => setExpandedIndex(isExpanded ? -1 : index)}
                    className="p-4 bg-slate-50/70 hover:bg-slate-100/70 cursor-pointer flex items-center justify-between transition-colors border-b border-slate-100"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-teal-100/70 text-teal-800 text-xs font-bold flex items-center justify-center flex-shrink-0">
                        #{index + 1}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-text-heading truncate">
                          {item.name || 'Untitled Medicine Item'}
                        </p>
                        <p className="text-[11px] text-text-muted">
                          Batch: {item.batchNumber || '—'} • Qty: {item.quantity} {item.unit}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {getShelfLifeChip(item.expiryDate)}
                      {warnings.length > 0 && (
                        <span className="p-1 rounded-full bg-amber-100 text-amber-700" title="Has screening warnings">
                          <AlertTriangle size={14} />
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicateItem(index);
                        }}
                        title="Duplicate item"
                        className="p-1.5 text-slate-400 hover:text-teal-700 rounded-lg hover:bg-slate-200/50"
                      >
                        <Copy size={14} />
                      </button>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveItem(index);
                          }}
                          title="Remove item"
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-200/50"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                      <div className="text-slate-400 pl-1">
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                    </div>
                  </div>

                  {/* Card Form Body */}
                  {isExpanded && (
                    <div className="p-5 space-y-4 bg-white">
                      {/* Live Policy Warning Banner */}
                      {warnings.length > 0 && (
                        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs space-y-1">
                          <p className="font-bold text-rose-800 flex items-center gap-1.5">
                            <AlertOctagon size={14} className="text-rose-600 flex-shrink-0" />
                            <span>This item will likely be rejected during automated screening:</span>
                          </p>
                          <ul className="text-rose-700 text-[11px] list-disc pl-5 space-y-0.5">
                            {warnings.map((w, wIdx) => (
                              <li key={wIdx}>{w.text}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Name & Generic Name */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input
                          label="Medicine Brand Name"
                          placeholder="e.g. Augmentin 625 Duo, Dolo 650"
                          value={item.name}
                          onChange={(e) => handleItemFieldChange(index, 'name', e.target.value)}
                          required
                        />
                        <Input
                          label="Generic / Salt Name (Optional)"
                          placeholder="e.g. Amoxicillin and Potassium Clavulanate"
                          value={item.genericName}
                          onChange={(e) => handleItemFieldChange(index, 'genericName', e.target.value)}
                        />
                      </div>

                      {/* Manufacturer, Batch & Expiry */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <Input
                          label="Manufacturer (Optional)"
                          placeholder="e.g. Sun Pharma, Cipla"
                          value={item.manufacturer}
                          onChange={(e) => handleItemFieldChange(index, 'manufacturer', e.target.value)}
                        />
                        <Input
                          label="Batch Number"
                          placeholder="e.g. B240987"
                          value={item.batchNumber}
                          onChange={(e) => handleItemFieldChange(index, 'batchNumber', e.target.value.toUpperCase())}
                          required
                        />
                        <MonthYearPicker
                          label="Expiration (MM/YYYY)"
                          value={item.expiryDate}
                          onChange={(val) => handleItemFieldChange(index, 'expiryDate', val)}
                          required
                        />
                      </div>

                      {/* Quantity, Unit & Units Per Pack */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <Input
                          type="number"
                          label="Donation Quantity"
                          min={1}
                          value={item.quantity}
                          onChange={(e) => handleItemFieldChange(index, 'quantity', e.target.value)}
                          required
                        />

                        <div>
                          <label className="block text-xs font-semibold text-text-heading mb-1.5">
                            Packaging Unit
                          </label>
                          <select
                            value={item.unit}
                            onChange={(e) => handleItemFieldChange(index, 'unit', e.target.value)}
                            className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-200 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20"
                          >
                            {MEDICINE_UNITS.map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <Input
                          type="number"
                          label="Units per Pack (Optional)"
                          placeholder="e.g. 10 tablets/strip"
                          value={item.unitsPerPack || ''}
                          onChange={(e) => handleItemFieldChange(index, 'unitsPerPack', e.target.value)}
                        />
                      </div>

                      {/* Medicine Type Selector Chips */}
                      <div>
                        <label className="block text-xs font-semibold text-text-heading mb-2">
                          Medicine Dosage Form
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {MEDICINE_TYPES.map((t) => (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => handleItemFieldChange(index, 'medicineType', t.id)}
                              className={`px-3 py-1.5 text-xs rounded-xl font-medium border transition-all ${
                                item.medicineType === t.id
                                  ? 'bg-teal-700 text-white border-teal-700 shadow-sm'
                                  : 'bg-white text-text-body border-slate-200 hover:border-teal-300'
                              } ${t.id === 'injection' ? 'border-rose-200 text-rose-700' : ''}`}
                            >
                              {t.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Packaging Condition Selection Cards */}
                      <div>
                        <label className="block text-xs font-semibold text-text-heading mb-2">
                          Packaging Condition <span className="text-rose-500">*</span>
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {PACKAGING_CONDITIONS.map((cond) => {
                            const isSelected = item.packagingCondition === cond.id;
                            return (
                              <div
                                key={cond.id}
                                onClick={() => handleItemFieldChange(index, 'packagingCondition', cond.id)}
                                className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                                  isSelected
                                    ? cond.accepted
                                      ? 'bg-teal-50/70 border-teal-600 ring-1 ring-teal-600'
                                      : 'bg-rose-50/70 border-rose-500 ring-1 ring-rose-500'
                                    : 'bg-white border-slate-200 hover:border-slate-300'
                                }`}
                              >
                                <div className="flex items-center justify-between mb-0.5">
                                  <span className="text-xs font-bold text-text-heading">
                                    {cond.label}
                                  </span>
                                  {cond.accepted ? (
                                    <Badge color="success">Eligible</Badge>
                                  ) : (
                                    <Badge color="danger">Rejected</Badge>
                                  )}
                                </div>
                                <p className="text-[11px] text-text-muted">{cond.desc}</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Storage Condition */}
                      <div>
                        <label className="block text-xs font-semibold text-text-heading mb-1.5">
                          Domestic Storage Condition
                        </label>
                        <select
                          value={item.storageCondition}
                          onChange={(e) => handleItemFieldChange(index, 'storageCondition', e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-200 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20"
                        >
                          {STORAGE_CONDITIONS.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Storage Notes & Rx Toggle */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                        <div className="sm:col-span-2">
                          <Input
                            label="Storage History Notes (Optional)"
                            placeholder="e.g. Stored in medicine cabinet away from moisture"
                            value={item.storageHistory}
                            onChange={(e) => handleItemFieldChange(index, 'storageHistory', e.target.value)}
                          />
                        </div>

                        <div className="pt-4">
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={item.isPrescriptionOnly}
                              onChange={(e) =>
                                handleItemFieldChange(index, 'isPrescriptionOnly', e.target.checked)
                              }
                              className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4"
                            />
                            <span className="text-xs font-semibold text-text-heading">
                              Prescription Drug (Rx)
                            </span>
                          </label>
                        </div>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP 2: PHOTO UPLOAD */}
      {activeStep === 1 && (
        <div className="space-y-6">
          <Card className="p-4 bg-teal-50/50 border border-teal-200 text-xs text-teal-900 flex items-start gap-3">
            <Camera size={18} className="text-teal-700 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Photograph Verification Guidelines:</p>
              <p className="text-[11px] text-teal-800 leading-relaxed mt-0.5">
                Please take clear, high-resolution photos of each medicine. We require at least 1 photo
                showing the brand name, batch number, and expiration date on the original packaging.
                Max {config.maxPhotos} photos per item (JPG, PNG, WebP up to 5MB).
              </p>
            </div>
          </Card>

          <div className="space-y-6">
            {items.map((item, itemIdx) => (
              <Card key={item._id || item._tempId} className="p-5 border border-slate-200 bg-white">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                  <div>
                    <span className="text-xs font-bold text-text-heading">
                      #{itemIdx + 1} {item.name}
                    </span>
                    <p className="text-[11px] text-text-muted">
                      Batch: {item.batchNumber} • Photos: {item.photos?.length || 0} of {config.maxPhotos}
                    </p>
                  </div>
                  {(item.photos?.length || 0) >= 1 ? (
                    <Badge color="success">Photo Attached</Badge>
                  ) : (
                    <Badge color="danger">Photo Required</Badge>
                  )}
                </div>

                {/* Dropzone area */}
                {(item.photos?.length || 0) < config.maxPhotos && (
                  <div className="mb-4">
                    <DropzoneItem
                      onFileSelect={(file) => handlePhotoUpload(itemIdx, file)}
                      disabled={saving}
                    />
                  </div>
                )}

                {/* Uploaded thumbnails */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {item.photos?.map((photo) => {
                    const blobUrl = photoBlobMap[photo._id];
                    return (
                      <div
                        key={photo._id}
                        className="relative group rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 aspect-video flex items-center justify-center"
                      >
                        {blobUrl ? (
                          <img
                            src={blobUrl}
                            alt={photo.originalName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="p-4 text-center">
                            <Spinner size="sm" />
                            <p className="text-[10px] text-text-muted mt-1">Loading photo...</p>
                          </div>
                        )}

                        {/* Overlay Actions */}
                        <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          {blobUrl && (
                            <button
                              type="button"
                              onClick={() =>
                                setLightboxState({
                                  isOpen: true,
                                  src: blobUrl,
                                  title: `${item.name} - ${photo.originalName}`,
                                })
                              }
                              className="p-1.5 rounded-full bg-white/90 text-slate-800 hover:bg-white"
                              title="View photo"
                            >
                              <Eye size={13} />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handlePhotoDelete(itemIdx, photo._id)}
                            className="p-1.5 rounded-full bg-rose-600 text-white hover:bg-rose-700"
                            title="Delete photo"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* STEP 3: PICKUP LOCATION & CONTACT */}
      {activeStep === 2 && (
        <Card className="p-6 bg-white border border-slate-200 space-y-6">
          <div>
            <h3 className="text-sm font-heading font-bold text-text-heading">
              Pickup Address & Contact Details
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              Specify where a volunteer or clinic courier can collect the verified medicines.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Input
                label="Street Address / Building"
                placeholder="e.g. Flat 302, Palm Heights, Main Street"
                value={pickupAddress.line1}
                onChange={(e) => setPickupAddress((p) => ({ ...p, line1: e.target.value }))}
                required
              />
            </div>

            <Input
              label="City"
              placeholder="e.g. Mumbai"
              value={pickupAddress.city}
              onChange={(e) => setPickupAddress((p) => ({ ...p, city: e.target.value }))}
              required
            />

            <Input
              label="State"
              placeholder="e.g. Maharashtra"
              value={pickupAddress.state}
              onChange={(e) => setPickupAddress((p) => ({ ...p, state: e.target.value }))}
              required
            />

            <Input
              label="PIN Code (6 Digits)"
              placeholder="e.g. 400001"
              maxLength={6}
              value={pickupAddress.pincode}
              onChange={(e) => setPickupAddress((p) => ({ ...p, pincode: e.target.value }))}
              required
            />

            <Input
              label="Contact Phone Number"
              placeholder="e.g. 9876543210"
              maxLength={10}
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              required
            />

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-text-heading mb-1.5">
                Preferred Pickup Time Window
              </label>
              <select
                value={preferredTimeSlot}
                onChange={(e) => setPreferredTimeSlot(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-200 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20"
              >
                <option value="Morning (9 AM - 12 PM)">Morning (9 AM - 12 PM)</option>
                <option value="Afternoon (12 PM - 4 PM)">Afternoon (12 PM - 4 PM)</option>
                <option value="Evening (4 PM - 7 PM)">Evening (4 PM - 7 PM)</option>
                <option value="Anytime (9 AM - 6 PM)">Anytime (9 AM - 6 PM)</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <Input
                label="Pickup Landmark or Special Notes (Optional)"
                placeholder="e.g. Near Community Park gate, ring doorbell"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          {/* Interactive Leaflet Map Picker */}
          <div>
            <label className="block text-xs font-semibold text-text-heading mb-1.5 flex items-center justify-between">
              <span>Pinpoint Exact Pickup Location <span className="text-rose-500">*</span></span>
              {location && (
                <span className="text-[11px] font-mono text-teal-800">
                  {location.lat.toFixed(4)}° N, {location.lng.toFixed(4)}° E
                </span>
              )}
            </label>
            <LocationPicker
              location={location}
              onLocationChange={(newLoc, addressParts) => {
                setLocation(newLoc);
                if (addressParts) {
                  setPickupAddress((prev) => ({
                    ...prev,
                    city: addressParts.city || prev.city,
                    state: addressParts.state || prev.state,
                    pincode: addressParts.pincode || prev.pincode,
                    line1: addressParts.line1 || prev.line1,
                  }));
                }
              }}
            />
          </div>
        </Card>
      )}

      {/* STEP 4: REVIEW & DECLARATIONS */}
      {activeStep === 3 && (
        <div className="space-y-6">
          {/* Summary Card */}
          <Card className="p-6 bg-white border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-heading font-bold text-text-heading">
                Donation Summary Review
              </h3>
              <Badge color="info">{items.length} Medicine(s)</Badge>
            </div>

            {/* Warnings Alert if any items will be rejected */}
            {itemsWithWarningsCount > 0 && (
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs space-y-1">
                <p className="font-bold text-amber-800 flex items-center gap-1.5">
                  <AlertTriangle size={14} className="text-amber-600 flex-shrink-0" />
                  <span>
                    Notice: {itemsWithWarningsCount} of your {items.length} item(s) violate donation safety rules.
                  </span>
                </p>
                <p className="text-amber-700 text-[11px]">
                  You can still submit; our automated engine will review each item individually. Non-compliant items will be rejected while safe items continue to pharmacist inspection.
                </p>
              </div>
            )}

            {/* Medicines List Summary */}
            <div className="space-y-3">
              {items.map((item, idx) => {
                const warnings = getClientSideWarnings(item);
                return (
                  <div
                    key={item._id || idx}
                    className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-start justify-between gap-3 text-xs"
                  >
                    <div>
                      <p className="font-bold text-text-heading">{item.name}</p>
                      <p className="text-[11px] text-text-muted mt-0.5">
                        Batch: {item.batchNumber} • Expiry: {item.expiryDate} • Qty: {item.quantity} {item.unit}
                      </p>
                      {warnings.length > 0 && (
                        <p className="text-[11px] text-rose-600 font-semibold mt-1">
                          ⚠️ {warnings[0].text}
                        </p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      {getShelfLifeChip(item.expiryDate)}
                      <p className="text-[10px] text-text-muted mt-1">{item.photos?.length || 0} photo(s)</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pickup Location Preview */}
            <div className="p-4 rounded-2xl bg-teal-50/40 border border-teal-100 text-xs">
              <p className="font-bold text-teal-900 mb-1">Pickup Information</p>
              <p className="text-text-body">
                {pickupAddress.line1}, {pickupAddress.city}, {pickupAddress.state} - {pickupAddress.pincode}
              </p>
              <p className="text-[11px] text-text-muted mt-1">
                Phone: {contactPhone} • Window: {preferredTimeSlot}
              </p>
            </div>
          </Card>

          {/* 4 Compliance Declarations */}
          <Card className="p-6 bg-white border border-slate-200 space-y-4">
            <div>
              <h3 className="text-sm font-heading font-bold text-text-heading flex items-center gap-2">
                <CheckSquare size={16} className="text-teal-700" />
                <span>Mandatory Compliance Declarations</span>
              </h3>
              <p className="text-xs text-text-muted mt-0.5">
                All declarations must be explicitly checked to guarantee pharmaceutical safety.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <label className="flex items-start gap-3 p-3 rounded-2xl border border-slate-100 hover:bg-slate-50 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={declarations.sealedAndUnused}
                  onChange={(e) =>
                    setDeclarations((d) => ({ ...d, sealedAndUnused: e.target.checked }))
                  }
                  className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4 mt-0.5"
                />
                <span className="text-text-body leading-relaxed">
                  I confirm that all donated medicines are in their <strong>original, sealed, and unused blister strips or bottles</strong> with no broken seals.
                </span>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-2xl border border-slate-100 hover:bg-slate-50 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={declarations.storedProperly}
                  onChange={(e) =>
                    setDeclarations((d) => ({ ...d, storedProperly: e.target.checked }))
                  }
                  className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4 mt-0.5"
                />
                <span className="text-text-body leading-relaxed">
                  I confirm that all items have been stored in <strong>clean, dry room-temperature conditions</strong> away from extreme heat, moisture, or direct sunlight.
                </span>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-2xl border border-slate-100 hover:bg-slate-50 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={declarations.notControlled}
                  onChange={(e) =>
                    setDeclarations((d) => ({ ...d, notControlled: e.target.checked }))
                  }
                  className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4 mt-0.5"
                />
                <span className="text-text-body leading-relaxed">
                  I confirm that none of these items are <strong>controlled, narcotic, habit-forming, or Schedule X pharmaceuticals</strong>.
                </span>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-2xl border border-slate-100 hover:bg-slate-50 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={declarations.genuineInfo}
                  onChange={(e) =>
                    setDeclarations((d) => ({ ...d, genuineInfo: e.target.checked }))
                  }
                  className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4 mt-0.5"
                />
                <span className="text-text-body leading-relaxed">
                  I certify that all details, batch numbers, and photographs submitted are <strong>genuine and accurate to the best of my knowledge</strong>.
                </span>
              </label>
            </div>

            {/* Platform legal disclaimer */}
            <p className="text-[11px] text-text-muted leading-relaxed pt-2 border-t border-slate-100">
              <strong>Compliance Notice:</strong> MediBridge is a software exchange platform. Donated
              medicines are redistributed strictly through verified, licensed charitable institutions
              and clinics following mandatory pharmacist physical inspection.
            </p>
          </Card>
        </div>
      )}

      {/* Navigation & Action Bar */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
        {activeStep > 0 ? (
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={handlePrev}
            disabled={saving || submitting}
            className="text-xs"
          >
            <ArrowLeft size={14} className="mr-1.5" />
            <span>Back</span>
          </Button>
        ) : (
          <div />
        )}

        {activeStep < 3 ? (
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={handleNext}
            disabled={saving}
            className="text-xs font-bold"
          >
            {saving ? (
              <>
                <Spinner size="xs" />
                <span className="ml-1.5">Autosaving...</span>
              </>
            ) : (
              <>
                <span>Next Step</span>
                <ArrowRight size={14} className="ml-1.5" />
              </>
            )}
          </Button>
        ) : (
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={() => setSubmitConfirmOpen(true)}
            disabled={
              submitting ||
              !declarations.sealedAndUnused ||
              !declarations.storedProperly ||
              !declarations.notControlled ||
              !declarations.genuineInfo
            }
            className="text-xs font-bold bg-teal-700 hover:bg-teal-800"
          >
            {submitting ? (
              <>
                <Spinner size="xs" />
                <span className="ml-1.5">Screening Items...</span>
              </>
            ) : (
              <>
                <ShieldCheck size={15} className="mr-1.5" />
                <span>Submit for Pharmacist Verification</span>
              </>
            )}
          </Button>
        )}
      </div>

      {/* Confirmation Modal */}
      <Modal
        isOpen={submitConfirmOpen}
        onClose={() => setSubmitConfirmOpen(false)}
        title="Submit Donation for Verification"
      >
        <div className="space-y-4 text-xs text-text-body">
          <p>
            Are you sure you are ready to submit <strong>{items.length} medicine item(s)</strong>?
          </p>
          <p className="text-text-muted">
            Upon submission, our automated screening engine will verify expiry dates and regulatory
            policies. Safe items will be immediately queued for inspection by licensed pharmacists.
          </p>
          <div className="flex justify-end gap-2 pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSubmitConfirmOpen(false)}
              disabled={submitting}
            >
              Review Details
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleFinalSubmit}
              disabled={submitting}
              className="font-bold"
            >
              {submitting ? 'Screening...' : 'Confirm & Submit'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Full-size Photo Lightbox */}
      <Lightbox
        isOpen={lightboxState.isOpen}
        onClose={() => setLightboxState({ isOpen: false, src: '', title: '' })}
        src={lightboxState.src}
        title={lightboxState.title}
      />
    </div>
  );
}

// Sub-component: Item Dropzone
function DropzoneItem({ onFileSelect, disabled }) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
    },
    maxSize: 5 * 1024 * 1024,
    multiple: false,
    disabled,
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        onFileSelect(acceptedFiles[0]);
      }
    },
    onDropRejected: (fileRejections) => {
      const err = fileRejections[0]?.errors[0];
      if (err?.code === 'file-too-large') {
        toast.error('File size exceeds 5MB limit.');
      } else {
        toast.error('Please upload a valid JPG, PNG, or WebP image.');
      }
    },
  });

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-colors ${
        isDragActive
          ? 'border-teal-600 bg-teal-50/50'
          : 'border-slate-200 hover:border-teal-400 bg-slate-50/50 hover:bg-white'
      } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
    >
      <input {...getInputProps()} />
      <UploadCloud size={24} className="mx-auto text-teal-700 mb-1.5" />
      <p className="text-xs font-semibold text-text-heading">
        Drag & drop packaging photo or <span className="text-teal-700 underline">browse</span>
      </p>
      <p className="text-[10px] text-text-muted mt-0.5">JPG, PNG, WebP up to 5MB</p>
    </div>
  );
}

