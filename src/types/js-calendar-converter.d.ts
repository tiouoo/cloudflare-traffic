declare module 'js-calendar-converter' {
  interface LunarDateResult {
    year: number;
    month: number;
    day: number;
    lYear: number;
    lMonth: number;
    lDay: number;
    isLeap: boolean;
    cYear: number;
    cMonth: number;
    cDay: number;
    gzYear: string;
    gzMonth: string;
    gzDay: string;
    ncWeek: number;
    nWeek: number;
    isTerm: boolean;
    Term: string;
    astro: string;
    Animal: string;
    IDayCn: string;
    IMonthCn: string;
  }

  interface CalendarConverter {
    solar2lunar: (year: number, month: number, day: number) => LunarDateResult | null;
  }

  const calendarConverter: CalendarConverter;
  export default calendarConverter;
}
