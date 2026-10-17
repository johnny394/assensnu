// Ugedage som i Danmark: 0 = mandag ... 6 = søndag
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type OpeningPeriod = {
  day: Weekday;
  open: string; // "HH:MM"
  close: string; // "HH:MM", må gerne være efter midnat, fx "02:00"
};

export type MenuItem = {
  name: string;
  description?: string;
  price: number; // kroner
};

export type MenuCategory = {
  name: string;
  items: MenuItem[];
};

export type Place = {
  slug: string;
  name: string;
  cuisines: string[];
  address: string;
  phone?: string;
  website?: string;
  facebook?: string;
  description?: string;
  takeaway: boolean | null; // null = ukendt
  dineIn: boolean | null;
  hours: OpeningPeriod[];
  closedToday?: boolean;
  menu: MenuCategory[];
};
