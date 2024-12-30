import React, { useState, useEffect } from "react";
import { Button, Dialog, DialogHeader, DialogBody, DialogFooter } from "@material-tailwind/react";

export function SessionTimeoutDialog({ open, onClose, onLogout }) {
  const [timeLeft, setTimeLeft] = useState(60); // Compte à rebours initial à 60 secondes

  useEffect(() => {
    if (!open) return;

    setTimeLeft(60); // Réinitialise le compte à rebours à chaque ouverture
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onLogout(); // Déconnecte l'utilisateur automatiquement
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval); // Nettoie l'intervalle lors de la fermeture
  }, [open, onLogout]);

  return (
    <Dialog open={open} handler={onClose}>
      <DialogHeader>Your session is about to expire!</DialogHeader>
      <DialogBody>
        Privacy is essential, and you've been logged in for quite some time.
        We will log you out in <strong>{timeLeft}</strong> seconds unless you confirm that you're still with us.
      </DialogBody>
      <DialogFooter className="gap-2">
        <Button
          variant="gradient"
          color="green"
          onClick={onClose}
        >
          <span>Continue working</span>
        </Button>
        <Button
          variant="text"
          color="gray"
          onClick={onLogout}
        >
          <span>Log out now</span>
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
