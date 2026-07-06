import { createContext, useContext, useState, useCallback } from 'react';

/* ── Default procedure fees ── */
export const DEFAULT_PROCEDURES = [
  { id: 'implant_surgery',   label: 'Implant Surgery (per implant)', fee: 25000 },
  { id: 'abutment',          label: 'Abutment Placement',            fee: 5000  },
  { id: 'crown_single',      label: 'Crown (Single)',                fee: 8000  },
  { id: 'fpd',               label: 'Fixed Partial Denture (FPD)',   fee: 15000 },
  { id: 'overdenture',       label: 'Overdenture',                   fee: 35000 },
  { id: 'bone_graft',        label: 'Bone Graft',                    fee: 8000  },
  { id: 'sinus_lift',        label: 'Sinus Lift',                    fee: 12000 },
  { id: 'gtr_membrane',      label: 'GTR Membrane Placement',        fee: 4000  },
  { id: 'consultation',      label: 'Consultation',                  fee: 500   },
];

/* ── Default material categories ── */
export const DEFAULT_MATERIAL_CATEGORIES = [
  { id: 'implant',   label: 'Implants'       },
  { id: 'abutment',  label: 'Abutments'      },
  { id: 'graft',     label: 'Bone Grafts'    },
  { id: 'membrane',  label: 'GTR Membranes'  },
  { id: 'crown',     label: 'Crown / Prosth' },
];

/* ── Default materials with cost-to-acquire and charge-to-patient ── */
export const DEFAULT_MATERIALS = [
  { id: 'm1', category: 'implant',  name: 'Nobel Active (Standard)',   cost: 12000, price: 18000 },
  { id: 'm2', category: 'implant',  name: 'Straumann BLT',             cost: 15000, price: 22000 },
  { id: 'm3', category: 'implant',  name: 'Osstem (Standard)',         cost: 4500,  price: 8000  },
  { id: 'm4', category: 'abutment', name: 'Stock Abutment (Titanium)', cost: 1500,  price: 3500  },
  { id: 'm5', category: 'abutment', name: 'Custom CAD/CAM Abutment',   cost: 4000,  price: 7500  },
  { id: 'm6', category: 'graft',    name: 'Xenograft (0.5cc)',         cost: 2500,  price: 5000  },
  { id: 'm7', category: 'graft',    name: 'Allograft (0.5cc)',         cost: 3000,  price: 6000  },
  { id: 'm8', category: 'membrane', name: 'Collagen Membrane',         cost: 1800,  price: 3500  },
  { id: 'm9', category: 'membrane', name: 'Ti-Mesh (Titanium)',        cost: 5000,  price: 9000  },
];

const STORAGE_KEY = 'osioloc_pricing';

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

function saveToStorage(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}

const PricingContext = createContext(null);

export function PricingProvider({ children }) {
  const stored = loadFromStorage();

  const [procedures, setProcedures] = useState(stored?.procedures ?? DEFAULT_PROCEDURES);
  const [materials, setMaterials]   = useState(stored?.materials  ?? DEFAULT_MATERIALS);
  const [materialCategories, setMaterialCategories] = useState(stored?.materialCategories ?? DEFAULT_MATERIAL_CATEGORIES);
  /* patientDiscounts: [{ id, patientId, patientName, type: 'percent'|'fixed', value, note }] */
  const [patientDiscounts, setPatientDiscounts] = useState(stored?.patientDiscounts ?? []);

  const persist = useCallback((next) => {
    saveToStorage(next);
  }, []);

  const p = (overrides) => persist({ procedures, materials, materialCategories, patientDiscounts, ...overrides });

  const updateProcedure = (id, fee) => {
    const next = procedures.map(proc => proc.id === id ? { ...proc, fee: Number(fee) } : proc);
    setProcedures(next); p({ procedures: next });
  };
  const addProcedure = (label, fee) => {
    const next = [...procedures, { id: `custom_${Date.now()}`, label, fee: Number(fee) }];
    setProcedures(next); p({ procedures: next });
  };
  const deleteProcedure = (id) => {
    const next = procedures.filter(proc => proc.id !== id);
    setProcedures(next); p({ procedures: next });
  };

  const addMaterialCategory = (label) => {
    const next = [...materialCategories, { id: `cat_${Date.now()}`, label, custom: true }];
    setMaterialCategories(next); p({ materialCategories: next });
  };
  const deleteMaterialCategory = (id) => {
    const nextCats = materialCategories.filter(c => c.id !== id);
    const nextMats = materials.filter(m => m.category !== id);
    setMaterialCategories(nextCats); setMaterials(nextMats);
    p({ materialCategories: nextCats, materials: nextMats });
  };

  const addMaterial = (mat) => {
    const next = [...materials, { ...mat, id: `mat_${Date.now()}` }];
    setMaterials(next); p({ materials: next });
  };
  const updateMaterial = (id, changes) => {
    const next = materials.map(m => m.id === id ? { ...m, ...changes } : m);
    setMaterials(next); p({ materials: next });
  };
  const deleteMaterial = (id) => {
    const next = materials.filter(m => m.id !== id);
    setMaterials(next); p({ materials: next });
  };

  const addDiscount = (discount) => {
    const next = [...patientDiscounts, { ...discount, id: `disc_${Date.now()}` }];
    setPatientDiscounts(next); p({ patientDiscounts: next });
  };
  const updateDiscount = (id, changes) => {
    const next = patientDiscounts.map(d => d.id === id ? { ...d, ...changes } : d);
    setPatientDiscounts(next); p({ patientDiscounts: next });
  };
  const deleteDiscount = (id) => {
    const next = patientDiscounts.filter(d => d.id !== id);
    setPatientDiscounts(next); p({ patientDiscounts: next });
  };

  /* Get the fee for a procedure by id */
  const getFee = (id) => procedures.find(p => p.id === id)?.fee ?? 0;

  /* Get margin for a material (price - cost) */
  const getMargin = (mat) => (mat.price || 0) - (mat.cost || 0);

  return (
    <PricingContext.Provider value={{
      procedures, materials, materialCategories, patientDiscounts,
      updateProcedure, addProcedure, deleteProcedure,
      addMaterialCategory, deleteMaterialCategory,
      addMaterial, updateMaterial, deleteMaterial,
      addDiscount, updateDiscount, deleteDiscount,
      getFee, getMargin,
    }}>
      {children}
    </PricingContext.Provider>
  );
}

export const usePricing = () => {
  const ctx = useContext(PricingContext);
  if (!ctx) throw new Error('usePricing must be inside PricingProvider');
  return ctx;
};
