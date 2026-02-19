"use client";

import React from "react";
import { usePushRegistration } from "@/hooks/usePushRegistration";

export default function PushRegistration(): React.JSX.Element {
  usePushRegistration();
  return <></>;
}
