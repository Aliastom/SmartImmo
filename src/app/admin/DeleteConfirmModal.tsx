"use client";
import React from "react";

type Props = {
  open: boolean;
  title: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  loading?: boolean;
};

export default function DeleteConfirmModal({ open, title, message, onCancel, onConfirm, loading }: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 relative">
        <h2 className="text-lg font-bold mb-4">{title}</h2>
        <div className="mb-6 text-gray-700">{message}</div>
        <div className="flex justify-end gap-2">
          <button
            className="px-4 py-1 rounded bg-gray-200 hover:bg-gray-300"
            onClick={onCancel}
            disabled={loading}
          >
            Annuler
          </button>
          <button
            className="px-4 py-1 rounded bg-red-600 text-white hover:bg-red-700"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Suppression..." : "Supprimer"}
          </button>
        </div>
      </div>
    </div>
  );
}
