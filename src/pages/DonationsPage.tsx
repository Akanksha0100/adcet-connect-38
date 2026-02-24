import { motion } from "framer-motion";
import { Heart, CreditCard, Building, GraduationCap, AlertCircle, Download, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";

const categories = [
  { label: "Infrastructure", icon: Building, desc: "Campus development & facilities" },
  { label: "Scholarships", icon: GraduationCap, desc: "Support student education" },
  { label: "Events", icon: Heart, desc: "Fund alumni events & meetups" },
  { label: "Emergency Fund", icon: AlertCircle, desc: "Crisis support for students" },
];

const presetAmounts = [500, 1000, 2000, 5000];

const recentDonations = [
  { name: "Priya S.", amount: "₹5,000", category: "Scholarships", date: "Feb 20, 2026" },
  { name: "Rahul P.", amount: "₹2,000", category: "Infrastructure", date: "Feb 18, 2026" },
  { name: "Sneha K.", amount: "₹1,000", category: "Events", date: "Feb 15, 2026" },
];

const DonationsPage = () => {
  const [selectedCategory, setSelectedCategory] = useState("Scholarships");
  const [amount, setAmount] = useState<number | string>(1000);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Donations</h1>
        <p className="text-muted-foreground text-sm mt-1">Give back to the ADCET community</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Donate Form */}
        <div className="lg:col-span-2 card-elevated p-6 space-y-6">
          <h2 className="text-lg font-semibold text-foreground">Make a Donation</h2>

          {/* Categories */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {categories.map(cat => (
              <button
                key={cat.label}
                onClick={() => setSelectedCategory(cat.label)}
                className={`p-4 rounded-xl border text-center transition-all ${selectedCategory === cat.label ? "border-accent bg-accent/5 ring-1 ring-accent" : "border-border hover:border-accent/50"}`}
              >
                <cat.icon className={`h-5 w-5 mx-auto mb-2 ${selectedCategory === cat.label ? "text-accent" : "text-muted-foreground"}`} />
                <p className="text-xs font-medium text-foreground">{cat.label}</p>
              </button>
            ))}
          </div>

          {/* Amount */}
          <div className="space-y-3">
            <Label>Select Amount</Label>
            <div className="flex flex-wrap gap-2">
              {presetAmounts.map(a => (
                <button
                  key={a}
                  onClick={() => setAmount(a)}
                  className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${amount === a ? "border-accent bg-accent/5 text-accent" : "border-border text-muted-foreground hover:border-accent/50"}`}
                >
                  ₹{a.toLocaleString()}
                </button>
              ))}
            </div>
            <Input
              type="number"
              placeholder="Enter custom amount"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="max-w-xs"
            />
          </div>

          {/* Payment */}
          <div className="space-y-3">
            <Label>Payment Method</Label>
            <div className="flex gap-2">
              {["UPI", "Card", "Net Banking"].map(method => (
                <Button key={method} variant="outline" size="sm">{method}</Button>
              ))}
            </div>
          </div>

          <Button className="w-full sm:w-auto px-8">
            <Heart className="mr-2 h-4 w-4" /> Donate ₹{Number(amount).toLocaleString()}
          </Button>
        </div>

        {/* Recent Donations */}
        <div className="card-elevated p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Recent Donations</h2>
          <div className="space-y-3">
            {recentDonations.map((d, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center">
                  <Heart className="h-4 w-4 text-accent" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{d.name} · {d.amount}</p>
                  <p className="text-xs text-muted-foreground">{d.category} · {d.date}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default DonationsPage;
