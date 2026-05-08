import { useState } from "react";
import { errorMessage } from "@/lib/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useSubmitFeedback } from "@/hooks/useSubmitFeedback";

type Props = {
  kind: "bug" | "feature";
  page_path: string;
  onClose: () => void;
};

export function FeedbackModal({ kind, page_path, onClose }: Props) {
  const submit = useSubmitFeedback();
  const [description, setDescription] = useState("");
  const valid = description.trim().length >= 3;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    try {
      await submit.mutateAsync({ kind, description, page_path });
      toast.success(
        kind === "bug" ? "Bug report submitted." : "Feature request submitted.",
      );
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  const title = kind === "bug" ? "Report a bug" : "Request a feature";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md space-y-3 rounded-md border border-border bg-popover p-5 shadow-lg"
      >
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            On page <code className="text-foreground">{page_path}</code>
          </p>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">
            {kind === "bug"
              ? "What went wrong? Steps to reproduce, what you expected, what happened."
              : "What feature would help? Describe the workflow."}
          </Label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            autoFocus
            placeholder={
              kind === "bug"
                ? "When I click upload, the page reloads instead of saving…"
                : "I'd love to be able to drag artworks between collections without opening each one…"
            }
            className="w-full rounded-md border border-input bg-background p-2 text-sm"
          />
        </div>
        {kind === "bug" ? (
          <p className="text-xs text-muted-foreground">
            Recent console logs and your last actions will be attached to help
            diagnosis.
          </p>
        ) : null}
        <div className="flex items-center justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={!valid || submit.isPending}
          >
            {submit.isPending ? "Sending…" : "Send"}
          </Button>
        </div>
      </form>
    </div>
  );
}
