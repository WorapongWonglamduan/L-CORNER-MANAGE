"use client";

import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ConfirmOptions {
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive";
}

interface ConfirmState extends ConfirmOptions {
  isOpen: boolean;
  resolve?: (value: boolean) => void;
}

export function useConfirm() {
  const [state, setState] = useState<ConfirmState>({
    isOpen: false,
    title: "Are you sure?",
    description: "This action cannot be undone.",
    confirmText: "Continue",
    cancelText: "Cancel",
    variant: "default",
  });

  const confirm = useCallback(
    (options?: ConfirmOptions): Promise<boolean> => {
      return new Promise((resolve) => {
        setState({
          isOpen: true,
          title: options?.title || "Are you sure?",
          description:
            options?.description || "This action cannot be undone.",
          confirmText: options?.confirmText || "Continue",
          cancelText: options?.cancelText || "Cancel",
          variant: options?.variant || "default",
          resolve,
        });
      });
    },
    []
  );

  const handleConfirm = useCallback(() => {
    setState((prev) => {
      prev.resolve?.(true);
      return { ...prev, isOpen: false };
    });
  }, []);

  const handleCancel = useCallback(() => {
    setState((prev) => {
      prev.resolve?.(false);
      return { ...prev, isOpen: false };
    });
  }, []);

  const ConfirmDialog = useCallback(
    () => (
      <Dialog open={state.isOpen} onOpenChange={handleCancel}>
        <DialogContent className="sm:max-w-md border-primary/20">
          <DialogHeader>
            <DialogTitle className="text-primary text-xl font-bold">
              {state.title}
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              {state.description}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button 
              variant="outline" 
              onClick={handleCancel}
              className="border-gray-300 hover:bg-gray-50"
            >
              {state.cancelText}
            </Button>
            <Button
              variant={state.variant === "destructive" ? "destructive" : "default"}
              onClick={handleConfirm}
              className={
                state.variant === "destructive"
                  ? ""
                  : "bg-gradient-to-r from-primary to-primary-light text-white"
              }
            >
              {state.confirmText}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    ),
    [state, handleConfirm, handleCancel]
  );

  return { confirm, ConfirmDialog };
}
