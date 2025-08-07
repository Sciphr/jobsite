// app/hooks/useRequireNotesOnRejection.js
"use client";

import { useState } from "react";
import { useSettings } from "@/app/hooks/useAdminData";

export const useRequireNotesOnRejection = () => {
  const { data: settingsData } = useSettings();
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState(null);

  // Get the setting value
  const requireNotesOnRejection = settingsData?.settings?.find(
    (setting) => setting.key === "require_notes_on_rejection"
  )?.parsedValue || false;


  // Function to check if notes are required for this status change
  const checkNotesRequired = (newStatus, currentStatus, hasNotes) => {
    if (newStatus === "Rejected" && newStatus !== currentStatus && requireNotesOnRejection) {
      // Always require notes for rejection when the setting is enabled
      // This ensures a specific rejection reason is provided
      return true;
    }
    return false;
  };

  // Function to handle status changes with notes validation
  const handleStatusChangeWithNotesCheck = async (
    applicationId,
    newStatus,
    currentStatus,
    currentNotes,
    updateFunction
  ) => {
    if (checkNotesRequired(newStatus, currentStatus, currentNotes)) {
      // Store the pending status change and open notes modal
      setPendingStatusChange({
        applicationId,
        newStatus,
        currentStatus,
        updateFunction,
      });
      setIsNotesModalOpen(true);
      return false; // Indicates the status change was not completed
    } else {
      // No notes required, proceed with the status change
      await updateFunction(applicationId, newStatus);
      return true; // Indicates the status change was completed
    }
  };

  // Function to complete the status change with notes
  const completeStatusChangeWithNotes = async (notes) => {
    if (!pendingStatusChange) return;

    const { applicationId, newStatus, updateFunction } = pendingStatusChange;

    try {
      let updatedApplication = null;

      // Call the update function with both status and notes
      if (updateFunction.length === 3) {
        // Function expects (id, status, notes)
        updatedApplication = await updateFunction(applicationId, newStatus, notes);
      } else {
        // Need to modify the fetch call to include notes
        const response = await fetch(`/api/admin/applications/${applicationId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus, notes }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to update application");
        }

        // Parse the updated application data from the response
        updatedApplication = await response.json();
      }

      // Close modal and clear pending state
      setIsNotesModalOpen(false);
      setPendingStatusChange(null);
      
      // Return the updated data so the calling component can handle cache updates
      return updatedApplication;
    } catch (error) {
      console.error("Error updating application with notes:", error);
      throw error;
    }
  };

  // Function to cancel the status change
  const cancelStatusChange = () => {
    setIsNotesModalOpen(false);
    setPendingStatusChange(null);
  };

  return {
    requireNotesOnRejection,
    isNotesModalOpen,
    pendingStatusChange,
    checkNotesRequired,
    handleStatusChangeWithNotesCheck,
    completeStatusChangeWithNotes,
    cancelStatusChange,
  };
};