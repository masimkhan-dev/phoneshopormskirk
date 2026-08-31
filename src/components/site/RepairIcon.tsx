import {
  BatteryCharging,
  Camera,
  Droplet,
  Plug,
  Search,
  Settings,
  Smartphone,
  Wrench,
  type LucideIcon,
} from "lucide-react";

const MAP: Record<string, LucideIcon> = {
  smartphone: Smartphone,
  battery: BatteryCharging,
  plug: Plug,
  camera: Camera,
  settings: Settings,
  search: Search,
  droplet: Droplet,
  wrench: Wrench,
};

export function RepairIcon({ name, className }: { name?: string | null; className?: string }) {
  const Icon = MAP[name ?? ""] ?? Wrench;
  return <Icon className={className} aria-hidden />;
}
