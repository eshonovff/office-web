export interface FilterOption {
  label: string;
  value: string | number;
}

export interface ActiveFilter {
  key: string;
  value: any;
}

export type FilterConfig =
  | {
      type: 'input';
      key: string;
      label: string;
      placeholder?: string;
    }
  | {
      type: 'select';
      key: string;
      label: string;
      options: FilterOption[];
      placeholder?: string;
    }
  | {
      type: 'number-range';
      keyFrom: string;
      keyTo: string;
      label: string;
      placeholderFrom?: string;
      placeholderTo?: string;
    }
  | {
      type: 'date';
      key: string;
      label: string;
      placeholder?: string;
    }
  | {
      type: 'date-range';
      keyFrom: string;
      keyTo: string;
      label: string;
      placeholderFrom?: string;
      placeholderTo?: string;
    };
