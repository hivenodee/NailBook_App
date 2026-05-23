"use client";

import * as React from "react";
import { Input } from "@/components/ui/Input";

export type StepDetailsProps = {
  name: string;
  setName: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
};

export function StepDetails({
  name,
  setName,
  email,
  setEmail,
  phone,
  setPhone,
}: StepDetailsProps): React.JSX.Element {
  return (
    <div className="space-y-5">
      <Input
        label="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Your name"
        autoComplete="name"
        required
      />
      <Input
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        helper="We'll send your confirmation here."
        autoComplete="email"
        required
      />
      <Input
        label="Phone"
        type="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="(555) 123 4567"
        helper="Optional. Used for appointment reminders."
        autoComplete="tel"
      />
    </div>
  );
}
