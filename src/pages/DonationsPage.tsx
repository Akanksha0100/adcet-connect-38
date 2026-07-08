import { useState } from "react";
import { motion } from "framer-motion";
import { Heart, Loader2, ShieldCheck, Download, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void; on: (e: string, cb: (r: unknown) => void) => void };
  }
}

interface OrderResponse {
  donationId: string;
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  donorName: string;
  donorEmail: string;
}

interface MyDonation {
  id: string;
  amount: number;
  status: "PLEDGED" | "RECEIVED" | "CANCELLED";
  createdAt: string;
  paidAt?: string | null;
  paymentMethod?: string | null;
  razorpayPaymentId?: string | null;
  receiptNo?: string | null;
  receiptKey?: string | null;
}

const PRESETS = [1000, 5000, 10000, 50000];
const RAZORPAY_SRC = "https://checkout.razorpay.com/v1/checkout.js";

const loadRazorpay = (): Promise<boolean> =>
  new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = RAZORPAY_SRC;
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });

const DonationsPage = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [preset, setPreset] = useState<number | "other">(1000);
  const [custom, setCustom] = useState("");
  const [message, setMessage] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [processing, setProcessing] = useState(false);

  const amount = preset === "other" ? Number(custom) || 0 : preset;

  const myDonations = useQuery({
    queryKey: ["donations", "me"],
    queryFn: () => api.get<MyDonation[] | { items?: MyDonation[] }>("/donations/me"),
  });
  const recent: MyDonation[] = Array.isArray(myDonations.data)
    ? myDonations.data
    : myDonations.data?.items ?? [];

  const verify = useMutation({
    mutationFn: (payload: {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
    }) => api.post("/donations/verify", payload),
    onSuccess: () => {
      toast({
        title: "Thank you for your donation! 🙏",
        description: "Payment successful. A receipt has been emailed to you.",
      });
      qc.invalidateQueries({ queryKey: ["donations"] });
      setMessage("");
    },
    onError: (e: any) =>
      toast({
        title: "Could not confirm payment",
        description: e?.message ?? "If money was deducted, it will be reconciled automatically.",
        variant: "destructive",
      }),
  });

  const donate = async () => {
    if (!amount || amount < 1) {
      toast({ title: "Enter a valid amount", variant: "destructive" });
      return;
    }
    setProcessing(true);
    try {
      const ok = await loadRazorpay();
      if (!ok) throw new Error("Could not load the payment gateway. Check your connection.");

      const order = await api.post<OrderResponse>("/donations/order", {
        amount,
        message: message || undefined,
        isAnonymous: anonymous,
      });

      if (!window.Razorpay) throw new Error("Payment gateway unavailable.");

      const rzp = new window.Razorpay({
        key: order.keyId,
        amount: order.amount * 100,
        currency: order.currency,
        name: "ADCET Alumni Portal",
        description: "Donation to ADCET",
        image: "/logo.jpeg",
        order_id: order.orderId,
        prefill: { name: order.donorName, email: order.donorEmail },
        notes: { donationId: order.donationId },
        theme: { color: "#1e3a5f" },
        handler: (resp: any) => {
          verify.mutate({
            razorpay_order_id: resp.razorpay_order_id,
            razorpay_payment_id: resp.razorpay_payment_id,
            razorpay_signature: resp.razorpay_signature,
          });
          setProcessing(false);
        },
        modal: {
          ondismiss: () => {
            setProcessing(false);
            toast({ title: "Payment cancelled", description: "No amount was charged." });
          },
        },
      });
      rzp.on("payment.failed", (resp: any) => {
        setProcessing(false);
        toast({
          title: "Payment failed",
          description: resp?.error?.description ?? "Please try again.",
          variant: "destructive",
        });
      });
      rzp.open();
    } catch (e: any) {
      setProcessing(false);
      toast({ title: "Donation failed", description: e?.message, variant: "destructive" });
    }
  };

  const downloadReceipt = async (key: string) => {
    try {
      const { url } = await api.post<{ url: string }>("/uploads/presign-download", { key });
      window.open(url, "_blank");
    } catch (e) {
      toast({ title: "Download failed", description: (e as Error).message, variant: "destructive" });
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Donations</h1>
        <p className="text-muted-foreground text-sm mt-1">Give back to the ADCET community</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card-elevated p-6 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Make a Donation</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Choose an amount and pay securely. Your receipt is generated automatically.
            </p>
          </div>

          <div className="space-y-3">
            <Label>Select an amount (₹)</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PRESETS.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setPreset(a)}
                  className={`px-4 py-3 rounded-xl border text-sm font-semibold transition-all ${
                    preset === a
                      ? "border-accent bg-accent/10 text-accent ring-1 ring-accent"
                      : "border-border text-foreground hover:border-accent/50"
                  }`}
                >
                  ₹{a.toLocaleString("en-IN")}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPreset("other")}
                className={`px-4 py-3 rounded-xl border text-sm font-semibold transition-all ${
                  preset === "other"
                    ? "border-accent bg-accent/10 text-accent ring-1 ring-accent"
                    : "border-border text-foreground hover:border-accent/50"
                }`}
              >
                Other
              </button>
            </div>
            {preset === "other" && (
              <Input
                type="number"
                min={1}
                autoFocus
                placeholder="Enter custom amount"
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                className="max-w-xs"
              />
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Message (optional)</Label>
            <Input
              value={message}
              maxLength={1000}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add a note with your donation"
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} />
            Show my donation as anonymous
          </label>

          <div className="rounded-lg bg-muted/50 p-3 flex items-start gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 mt-0.5 text-accent flex-shrink-0" />
            <span>
              Payments are processed securely via Razorpay. Pay using UPI (Google Pay, PhonePe, Paytm),
              cards, net banking or wallets. Your donation is recorded and verified automatically — no forms to fill.
            </span>
          </div>

          <Button
            onClick={donate}
            disabled={processing || verify.isPending || !amount}
            className="w-full sm:w-auto px-8"
          >
            {processing || verify.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Heart className="mr-2 h-4 w-4" /> Donate ₹{Number(amount || 0).toLocaleString("en-IN")}
              </>
            )}
          </Button>
        </div>

        <div className="card-elevated p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">My Recent Donations</h2>
          <div className="space-y-3">
            {myDonations.isLoading &&
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
            {!myDonations.isLoading && recent.length === 0 && (
              <p className="text-sm text-muted-foreground">No donations yet.</p>
            )}
            {recent.slice(0, 6).map((d) => (
              <div key={d.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                  {d.status === "RECEIVED" ? (
                    <CheckCircle2 className="h-4 w-4 text-accent" />
                  ) : (
                    <Heart className="h-4 w-4 text-accent" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    ₹{Number(d.amount).toLocaleString("en-IN")}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {new Date(d.paidAt ?? d.createdAt).toLocaleDateString()} ·{" "}
                    <span
                      className={
                        d.status === "RECEIVED"
                          ? "text-accent"
                          : d.status === "CANCELLED"
                            ? "text-destructive"
                            : "text-amber-600"
                      }
                    >
                      {d.status === "RECEIVED" ? "Paid" : d.status === "PLEDGED" ? "Pending" : "Cancelled"}
                    </span>
                  </p>
                </div>
                {d.receiptKey && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 flex-shrink-0"
                    title="Download receipt"
                    onClick={() => downloadReceipt(d.receiptKey!)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default DonationsPage;
