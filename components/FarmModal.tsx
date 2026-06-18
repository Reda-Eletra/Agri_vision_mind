import React, { useState, useEffect, useRef } from "react";
import type { Farm } from "../types";
import { useTranslation } from "../contexts/LanguageContext";

import { FarmMap } from "./FarmMap";

interface FarmModalProps {
  mode: "add" | "edit";
  farm: Farm | null;
  onSave: (farm: Farm) => Promise<void>;
  onClose: () => void;
  onDelete: (farmId: string) => void;
}

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

const emptyFarm: Omit<Farm, "id"> = {
  name: "",
  location: "",
  area: 0,
  areaUnit: "acre",
  soilType: "Loam",
  imageUrl: undefined,
  coordinates: [],
};

export const FarmModal: React.FC<FarmModalProps> = ({
  mode,
  farm,
  onSave,
  onClose,
  onDelete,
}) => {
  const { t, language } = useTranslation();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const [editedFarm, setEditedFarm] = useState<Omit<Farm, "id">>(() =>
    farm ? { ...farm } : emptyFarm
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<"details" | "map">("details");
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [saveError, setSaveError] = useState("");
  const saveInFlight = useRef(false);

  const handleSave = async () => {
    if (saveInFlight.current) return;
    if (!editedFarm.name.trim()) {
      alert("Farm name is required.");
      return;
    }
    if (editedFarm.area <= 0) {
      alert(t("modals.farm.validationError"));
      return;
    }
    setSaveError("");
    saveInFlight.current = true;
    setIsProcessing(true);

    try {
      const farmToSave: Farm = {
        id: farm?.id || "",
        ...editedFarm,
      };

      await onSave(farmToSave);
    } catch (error) {
      console.error("Error saving farm", error);
      setSaveError(error instanceof Error ? error.message : "Unable to save farm.");
    } finally {
      saveInFlight.current = false;
      setIsProcessing(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const base64 = await fileToBase64(file);
      setEditedFarm({ ...editedFarm, imageUrl: base64 });
    }
  };

  const title =
    mode === "add" ? t("modals.farm.addTitle") : t("modals.farm.editTitle");

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 animate-fade-in p-4" role="dialog" aria-modal="true" aria-labelledby="farm-modal-title">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 id="farm-modal-title" className="text-2xl font-bold text-brand-green-dark dark:text-brand-green-light">
              {title}
            </h2>
            <div className="flex gap-2 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab("details")}
                className={`px-3 py-1 rounded-md text-sm font-bold ${
                  activeTab === "details"
                    ? "bg-white dark:bg-gray-600 shadow"
                    : "text-gray-500"
                }`}
              >
                Details
              </button>
              <button
                onClick={() => setActiveTab("map")}
                className={`px-3 py-1 rounded-md text-sm font-bold ${
                  activeTab === "map"
                    ? "bg-white dark:bg-gray-600 shadow"
                    : "text-gray-500"
                }`}
              >
                Map Draw
              </button>
            </div>
          </div>

          {activeTab === "details" ? (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              <div>
                <label htmlFor="farmName" className="block text-sm font-medium">
                  Farm Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="farmName"
                  aria-required="true"
                  value={editedFarm.name}
                  onChange={(e) =>
                    setEditedFarm({ ...editedFarm, name: e.target.value })
                  }
                  placeholder="e.g. North Field"
                  className="mt-1 block w-full input-style"
                />
              </div>
              <div>
                <label htmlFor="location" className="block text-sm font-medium">
                  Location
                </label>
                <input
                  type="text"
                  id="location"
                  value={editedFarm.location || ""}
                  onChange={(e) =>
                    setEditedFarm({ ...editedFarm, location: e.target.value })
                  }
                  placeholder="e.g. Cairo, Egypt"
                  className="mt-1 block w-full input-style"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="area" className="block text-sm font-medium">
                    {t("modals.farm.area")}
                  </label>
                  <input
                    type="number"
                    id="area"
                    value={editedFarm.area}
                    onChange={(e) =>
                      setEditedFarm({
                        ...editedFarm,
                        area: e.target.value === "" ? 0 : parseFloat(e.target.value),
                      })
                    }
                    className="mt-1 block w-full input-style"
                  />
                </div>
                <div>
                  <label
                    htmlFor="areaUnit"
                    className="block text-sm font-medium"
                  >
                    {t("modals.farm.unit")}
                  </label>
                  <select
                    id="areaUnit"
                    value={editedFarm.areaUnit}
                    onChange={(e) =>
                      setEditedFarm({
                        ...editedFarm,
                        areaUnit: e.target.value as Farm["areaUnit"],
                      })
                    }
                    className="mt-1 block w-full input-style"
                  >
                    <option value="acre">{t("modals.farm.acres")}</option>
                    <option value="hectare">{t("modals.farm.hectares")}</option>
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="soilType" className="block text-sm font-medium">
                  {t("modals.farm.soilType")}
                </label>
                <select
                  id="soilType"
                  value={editedFarm.soilType}
                  onChange={(e) =>
                    setEditedFarm({
                      ...editedFarm,
                      soilType: e.target.value as Farm["soilType"],
                    })
                  }
                  className="mt-1 block w-full input-style"
                >
                  <option>Loam</option>
                  <option>Clay</option>
                  <option>Sandy</option>
                  <option>Silt</option>
                  <option>Peat</option>
                  <option>Calcareous</option>
                  <option>Chalky</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium">
                  {t("modals.farm.photo")}
                </label>
                {editedFarm.imageUrl && (
                  <img
                    src={editedFarm.imageUrl}
                    alt="Farm preview"
                    className="my-2 max-h-40 rounded-md"
                  />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-green-light/20 file:text-brand-green-dark hover:file:bg-brand-green-light/40 dark:file:bg-gray-600 dark:file:text-gray-300"
                />
              </div>
            </div>
          ) : (
            <div className="h-[240px] sm:h-[320px] md:h-[400px] w-full rounded-xl overflow-hidden border border-[var(--ag-border)]">
              <FarmMap
                mode="edit"
                coordinates={editedFarm.coordinates}
                onCoordinatesChange={(coords) =>
                  setEditedFarm({ ...editedFarm, coordinates: coords })
                }
              />
              <p className="text-xs text-center text-gray-500 mt-2">
                Tap on the map to define farm boundaries.
              </p>
            </div>
          )}
        </div>

        <div className="p-4 bg-gray-50 dark:bg-gray-900/50 flex justify-between items-center">
          <div>
            {mode === "edit" && !isConfirmingDelete && (
              <button
                onClick={() => setIsConfirmingDelete(true)}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-semibold"
              >
                {t("modals.farm.delete")}
              </button>
            )}
            {mode === "edit" && isConfirmingDelete && (
              <div className="flex flex-col gap-1">
                <p className="text-xs text-red-600 font-semibold mb-1">{t("modals.farm.deleteConfirmDesc")}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => { farm && onDelete(farm.id); }}
                    className="px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-semibold"
                  >
                    {t("modals.farm.deleteConfirm")}
                  </button>
                  <button
                    onClick={() => setIsConfirmingDelete(false)}
                    className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md text-sm font-semibold"
                  >
                    {t("modals.farm.deleteCancel")}
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="btn-secondary">
              {t("modals.farm.cancel")}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isProcessing}
              className="btn-primary disabled:bg-gray-400"
            >
              {isProcessing ? t("modals.farm.saving") : t("modals.farm.save")}
            </button>
          </div>
        </div>
        {saveError ? (
          <p role="alert" className="px-4 pb-4 text-sm font-semibold text-red-600">
            {saveError}
          </p>
        ) : null}
      </div>
      {/* Simple CSS for reuse */}
      <style>{`
                .input-style {
                    padding: 8px 12px;
                    border: 1px solid #d1d5db;
                    border-radius: 0.375rem;
                     width: 100%;
                }
                .dark .input-style {
                    background-color: #374151;
                    border-color: #4b5563;
                    color: white;
                }
                .input-style:focus {
                     outline: 2px solid transparent;
                     outline-offset: 2px;
                     border-color: #3CB371;
                     box-shadow: 0 0 0 2px rgba(60, 179, 113, 0.5);
                }
                .btn-primary {
                    padding: 8px 16px;
                    background-color: #3CB371;
                    color: white;
                    border-radius: 0.375rem;
                    font-weight: 600;
                    font-size: 0.875rem;
                    border: 0;
                }
                .btn-primary:hover {
                    background-color: #2e8b57;
                }
                 .btn-secondary {
                    padding: 8px 16px;
                    background-color: #e5e7eb;
                    color: #1f2937;
                    border-radius: 0.375rem;
                    font-weight: 600;
                    font-size: 0.875rem;
                    border: 0;
                }
                .dark .btn-secondary {
                    background-color: #4b5563;
                    color: #e5e7eb;
                }
            `}</style>
    </div>
  );
};
