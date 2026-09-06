declare module 'ical.js' {
  export function parse(input: string): unknown

  export class Component {
    constructor(jCal: unknown)
    getAllSubcomponents(name: string): Component[]
    getFirstPropertyValue(name: string): unknown
  }

  export class Event {
    constructor(component: Component)
    readonly uid: string
    readonly summary: string
    readonly startDate?: { toJSDate(): Date }
    readonly endDate?: { toJSDate(): Date }
  }

  const ICAL: {
    parse: typeof parse
    Component: typeof Component
    Event: typeof Event
  }

  export default ICAL
}
