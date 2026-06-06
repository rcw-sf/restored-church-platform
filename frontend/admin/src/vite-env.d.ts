/// <reference types="vite/client" />
import type {
  CalendarRangeProps,
  CalendarMonthProps,
  CalendarDateProps,
  CalendarMultiProps,
} from "cally";

type MapEvents<T> = {
  [K in keyof T as K extends `on${infer E}` ? `on${Lowercase<E>}` : K]: T[K];
};

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "calendar-month": MapEvents<CalendarMonthProps>;
      "calendar-date": MapEvents<CalendarDateProps>;
      "calendar-range": MapEvents<CalendarRangeProps>;
      "calendar-multi": MapEvents<CalendarMultiProps>;
      "calendar-month-grid": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
    }
  }
}
