/**
 * Reusable "Reject with reason" dialog. The reason is optional but encouraged.
 * The parent provides the action label and the async onConfirm callback.
 */
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  onConfirm: (reason: string) => Promise<unknown> | void;
  pending?: boolean;
}

export const RejectReasonDialog = ({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  pending,
}: Props) => {
  const [reason, setReason] = useState("");

  const close = (next: boolean) => {
    if (!next) setReason("");
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="reject-reason">
            Reason <span className="text-muted-foreground font-normal">(shown to the user)</span>
          </Label>
          <Textarea
            id="reject-reason"
            placeholder="e.g. We could not verify your enrolment details. Please re-apply with proof."
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => close(false)} disabled={pending}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={async () => {
              await onConfirm(reason.trim());
              close(false);
            }}
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
            Reject
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RejectReasonDialog;