import Foundation
import AppKit
import EventKit

// Read-only bridge. EventKit's full-access permission is required by macOS to read;
// this executable has no event creation, modification or deletion operations.
struct Request: Decodable {
    let action: String
    let ids: [String]?
    let from: Double?
    let to: Double?
}
let app = NSApplication.shared
app.setActivationPolicy(.accessory)
let arguments = CommandLine.arguments
 guard arguments.count == 3 else { exit(2) }
let requestURL = URL(fileURLWithPath: arguments[1])
let responseURL = URL(fileURLWithPath: arguments[2])
let store = EKEventStore()
var finished = false
func finish(_ object: Any) {
    do {
        let data = try JSONSerialization.data(withJSONObject: object, options: [.sortedKeys])
        try data.write(to: responseURL, options: .atomic)
        try FileManager.default.setAttributes([.posixPermissions: 0o600], ofItemAtPath: responseURL.path)
    } catch { exit(3) }
    finished = true
}
func allowed() -> Bool {
    let status = EKEventStore.authorizationStatus(for: .event)
    if #available(macOS 14, *) { return status == .fullAccess }
    return status == .authorized
}
func execute(_ request: Request) {
    if request.action == "status" {
        let status = EKEventStore.authorizationStatus(for: .event)
        finish(["authorized": allowed(), "notDetermined": status == .notDetermined]); return
    }
    guard allowed() else {
        finish(["error": "Autorizza ChronoCal in Impostazioni di Sistema → Privacy e sicurezza → Calendari, poi riprova."]); return
    }
    if request.action == "connect" { finish(["authorized": true]); return }
    let calendars = store.calendars(for: .event)
    if request.action == "calendars" {
        finish(["calendars": calendars.map { ["id": $0.calendarIdentifier, "summary": $0.title, "account": $0.source.title] }.sorted { $0["summary", default: ""] < $1["summary", default: ""] }]); return
    }
    guard request.action == "events", let ids = request.ids, !ids.isEmpty, ids.count <= 30,
          let from = request.from, let to = request.to,
          from.isFinite, to.isFinite, to > from, to - from <= 366 * 86400 * 1000 else {
        finish(["error": "Intervallo o calendari non validi."]); return
    }
    let selected = calendars.filter { ids.contains($0.calendarIdentifier) }
    guard selected.count == Set(ids).count else {
        finish(["error": "Un calendario non è più disponibile. Aggiorna l’elenco."]); return
    }
    let predicate = store.predicateForEvents(withStart: Date(timeIntervalSince1970: from / 1000), end: Date(timeIntervalSince1970: to / 1000), calendars: selected)
    let formatter = ISO8601DateFormatter()
    let events: [[String: Any]] = store.events(matching: predicate).map { event in
        let declined = event.attendees?.contains { $0.isCurrentUser && $0.participantStatus == .declined } ?? false
        let start = formatter.string(from: event.startDate)
        let end = formatter.string(from: event.endDate)
        return ["calendarId": event.calendar.calendarIdentifier,
                "summary": event.title ?? "Senza titolo",
                "status": event.status == .canceled || declined ? "cancelled" : "confirmed",
                "start": [event.isAllDay ? "date" : "dateTime": start],
                "end": [event.isAllDay ? "date" : "dateTime": end]]
    }
    finish(["calendars": selected.map { ["id": $0.calendarIdentifier, "summary": $0.title, "account": $0.source.title] }, "events": events])
}
do {
    let request = try JSONDecoder().decode(Request.self, from: Data(contentsOf: requestURL))
    if request.action == "connect" && !allowed() && EKEventStore.authorizationStatus(for: .event) == .notDetermined {
        app.activate(ignoringOtherApps: true)
        let completion: EKEventStoreRequestAccessCompletionHandler = { granted, error in
            DispatchQueue.main.async {
                if granted { execute(request) }
                else { finish(["error": "Permesso Calendari non concesso. Puoi abilitarlo in Privacy e sicurezza → Calendari."]) }
            }
        }
        if #available(macOS 14, *) { store.requestFullAccessToEvents(completion: completion) }
        else { store.requestAccess(to: .event, completion: completion) }
    } else { execute(request) }
} catch { finish(["error": "Richiesta Calendario non valida."]) }
while !finished { RunLoop.current.run(until: Date(timeIntervalSinceNow: 0.05)) }
