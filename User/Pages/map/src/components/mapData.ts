export type MarkerCategory =
  | "animal-report"
  | "animal-shelter"
  | "vet-clinic"
  | "ngo"
  | "lost-pet";

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  label: string;
  category: MarkerCategory;
  description?: string;
}

export const categoryConfig: Record<
  MarkerCategory,
  { color: string; icon: string; label: string }
> = {
  "animal-report": {
    color: "#F5A623",
    icon: "🐾",
    label: "Animal Report",
  },
  "animal-shelter": {
    color: "#7B68EE",
    icon: "🏠",
    label: "Animal Shelter",
  },
  "vet-clinic": {
    color: "#E84C6F",
    icon: "🏥",
    label: "Vet Clinic",
  },
  ngo: {
    color: "#4CAF50",
    icon: "🤝",
    label: "NGO",
  },
  "lost-pet": {
    color: "#FF69B4",
    icon: "🔍",
    label: "Lost Pet",
  },
};

export const markers: MapMarker[] = [
  // Animal Reports
  {
    id: "ar-1",
    lat: 6.8975,
    lng: 79.856,
    label: "Injured stray dog",
    category: "animal-report",
    description: "Stray dog with injured leg near Colombo Plan Rd",
  },
  {
    id: "ar-2",
    lat: 6.893,
    lng: 79.8585,
    label: "Stray cat colony",
    category: "animal-report",
    description: "Group of stray cats near School Ln / Temple Ln",
  },
  {
    id: "ar-3",
    lat: 6.891,
    lng: 79.86,
    label: "Abandoned puppies",
    category: "animal-report",
    description: "3 puppies found near Edward Ln",
  },
  {
    id: "ar-4",
    lat: 6.8835,
    lng: 79.8625,
    label: "Dog in distress",
    category: "animal-report",
    description: "Dog near Lauris Rd appears malnourished",
  },
  {
    id: "ar-5",
    lat: 6.902,
    lng: 79.8555,
    label: "Stray dog pack",
    category: "animal-report",
    description: "Pack of strays near Bagatalle Rd area",
  },

  // Vet Clinics
  {
    id: "vc-1",
    lat: 6.878,
    lng: 79.867,
    label: "PetVet Clinic",
    category: "vet-clinic",
    description: "Full-service veterinary clinic",
  },
  {
    id: "vc-2",
    lat: 6.895,
    lng: 79.871,
    label: "Animal Care Center",
    category: "vet-clinic",
    description: "Emergency vet services available",
  },
  {
    id: "vc-3",
    lat: 6.888,
    lng: 79.858,
    label: "Colombo Pet Hospital",
    category: "vet-clinic",
    description: "24/7 pet hospital services",
  },

  // NGOs
  {
    id: "ngo-1",
    lat: 6.876,
    lng: 79.874,
    label: "Police Grounds Animal Welfare",
    category: "ngo",
    description: "Animal welfare organization near Police Grounds",
  },
  {
    id: "ngo-2",
    lat: 6.905,
    lng: 79.887,
    label: "Sri Lanka Animal Welfare",
    category: "ngo",
    description: "National animal welfare NGO",
  },
  {
    id: "ngo-3",
    lat: 6.8865,
    lng: 79.8525,
    label: "Animal Rescue Foundation",
    category: "ngo",
    description: "Rescue and rehabilitation services",
  },

  // Animal Shelters
  {
    id: "as-1",
    lat: 6.875,
    lng: 79.88,
    label: "Colombo Animal Shelter",
    category: "animal-shelter",
    description: "Main city animal shelter",
  },
  {
    id: "as-2",
    lat: 6.897,
    lng: 79.865,
    label: "Bambalapitiya Shelter",
    category: "animal-shelter",
    description: "Temporary shelter for rescued animals",
  },

  // Lost Pets
  {
    id: "lp-1",
    lat: 6.907,
    lng: 79.854,
    label: "Lost: Golden Retriever",
    category: "lost-pet",
    description: "Missing since Jan 15, answers to 'Buddy'",
  },
  {
    id: "lp-2",
    lat: 6.882,
    lng: 79.876,
    label: "Lost: Tabby Cat",
    category: "lost-pet",
    description: "Missing orange tabby cat, neutered male",
  },
  {
    id: "lp-3",
    lat: 6.874,
    lng: 79.859,
    label: "Lost: Persian Cat",
    category: "lost-pet",
    description: "White Persian cat, missing since Feb 1",
  },
];

export const MAP_CENTER: [number, number] = [6.8895, 79.8656];
export const MAP_ZOOM = 15;

export const typeFilterOptions = [
  { value: "", label: "- Select Type" },
  { value: "animal-report", label: "Animal Reports" },
  { value: "ngo", label: "NGOs" },
  { value: "vet-clinic", label: "Vet clinics" },
  { value: "lost-pet", label: "Lost Pets" },
];

export const radiusFilterOptions = [
  { value: "", label: "- Select Radius" },
  { value: "5", label: "5km" },
  { value: "10", label: "10km" },
  { value: "25", label: "25km" },
  { value: "none", label: "No Limit" },
];

export const bottomTabs: {
  id: MarkerCategory | "all";
  label: string;
  icon: string;
  filterCategory?: MarkerCategory;
}[] = [
  {
    id: "animal-report" as MarkerCategory,
    label: "Animal Reports",
    icon: "📋",
    filterCategory: "animal-report",
  },
  {
    id: "animal-shelter" as MarkerCategory,
    label: "Animal Shelters",
    icon: "🏠",
    filterCategory: "animal-shelter",
  },
  {
    id: "vet-clinic" as MarkerCategory,
    label: "Vet Clinics",
    icon: "🐾",
    filterCategory: "vet-clinic",
  },
  {
    id: "ngo" as MarkerCategory,
    label: "NGOs",
    icon: "🤝",
    filterCategory: "ngo",
  },
  {
    id: "lost-pet" as MarkerCategory,
    label: "Lost Pets",
    icon: "🔍",
    filterCategory: "lost-pet",
  },
];
