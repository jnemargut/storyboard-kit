/**
 * The storyboard vocabulary: the single source of truth.
 * The JSON Schema, `storyboard validate`, `storyboard vocab`, the agent skill's reference
 * files and the renderer all read from here, so they cannot drift apart.
 */

export type Entry = { id: string; desc: string };
const e = (id: string, desc: string): Entry => ({ id, desc });

export const SCENES = [
  e("coffee-shop", "Counter, menu board, espresso machine, barista. Marks: counter, barista (behind the counter), queue, table, door."),
  e("kitchen", "Home kitchen with counter, fridge, window. Marks: counter, fridge, table."),
  e("living-room", "Sofa, lamp, TV on the wall. Marks: sofa, tv, floor."),
  e("bedroom", "Bed, nightstand, window at night or morning. Marks: bed, nightstand, door."),
  e("office", "Desk with monitor, chair, plant, window. Marks: desk, chair, window, door."),
  e("meeting-room", "Table, whiteboard, wall screen. Marks: table-left, table-right, whiteboard, screen."),
  e("car", "Car interior from the side: seat, wheel, dashboard display. Marks: driver-seat, passenger-seat, dashboard."),
  e("street", "Sidewalk, storefronts, lamp post, curb. Marks: sidewalk, curb, storefront, crossing."),
  e("transit", "Bus or train interior: seats, pole, windows. Marks: seat, standing, door."),
  e("store", "Shop checkout: counter, shelves, payment terminal. Marks: checkout, cashier (behind the counter), aisle, entrance."),
  e("hospital", "Ward with a patient bed, IV pole and nurses' station. Marks: bed, bedside, corridor, station (behind the counter)."),
  e("school", "School entrance: fence, gate, doors, sign. Marks: sidewalk, gate, door."),
  e("airport", "Gate seating, departure board, check-in counter, plane in the window. Marks: check-in, agent (behind the counter), gate-seat, window."),
  e("restaurant", "Table for two, pendant lights, waiter. Marks: table-left, table-right, waiter, door."),
  e("gym", "Treadmill, weights rack, bench, mirror. Marks: floor, treadmill, bench, mirror."),
  e("clinic", "Doctor's waiting room with reception desk. Marks: waiting (seated), reception, receptionist (behind the desk), door."),
  e("parking", "Parking garage: parked car, EV charger, pillar. Marks: car-door, charger, walkway."),
  e("bus-stop", "Bus shelter with bench, schedule and sign. Marks: bench, shelter, sidewalk, curb."),
  e("park", "Trees, a bench and a path. Marks: bench, path, tree."),
  e("home-office", "Desk at home by a window, bookshelf. Marks: desk-chair, bookshelf, door."),
  e("hotel", "Front desk with bell, elevator, luggage cart. Marks: desk, clerk (behind the desk), lobby, elevator."),
  e("classroom", "Whiteboard, desks, clock. Marks: desk, back-row, teacher, board."),
  e("blank", "Empty panel with a floor line. Marks: left, center, right."),
] as const;

export const SCENE_MARKS: Record<string, string[]> = {
  "coffee-shop": ["counter", "barista", "queue", "table", "door"],
  kitchen: ["counter", "fridge", "table"],
  "living-room": ["sofa", "tv", "floor"],
  bedroom: ["bed", "nightstand", "door"],
  office: ["desk", "chair", "window", "door"],
  "meeting-room": ["table-left", "table-right", "whiteboard", "screen"],
  car: ["driver-seat", "passenger-seat", "dashboard"],
  street: ["sidewalk", "curb", "storefront", "crossing"],
  transit: ["seat", "standing", "door"],
  store: ["checkout", "cashier", "aisle", "entrance"],
  hospital: ["bed", "bedside", "corridor", "station"],
  school: ["sidewalk", "gate", "door"],
  airport: ["check-in", "agent", "gate-seat", "window"],
  restaurant: ["table-left", "table-right", "waiter", "door"],
  gym: ["floor", "treadmill", "bench", "mirror"],
  clinic: ["waiting", "reception", "receptionist", "door"],
  parking: ["car-door", "charger", "walkway"],
  "bus-stop": ["bench", "shelter", "sidewalk", "curb"],
  park: ["bench", "path", "tree"],
  "home-office": ["desk-chair", "bookshelf", "door"],
  hotel: ["desk", "clerk", "lobby", "elevator"],
  classroom: ["desk", "back-row", "teacher", "board"],
  blank: ["left", "center", "right"],
};

export const SHOTS = [
  e("wide", "Establishing shot: the whole scene, people full-body. Use it to show where they are and what else is going on."),
  e("medium", "Waist-up on the focus character (or two characters). Body language and what's in their hands."),
  e("close-up", "Face fills the panel. Emotion: frustration, relief, confusion."),
  e("over-the-shoulder", "From behind the character, looking at their device. What they see and how they react."),
  e("screen", "The device fills the panel, held in a hand. Use when the UI itself is the point."),
  e("pov", "First person: two hands holding the device, as if you are them."),
] as const;

export const POSES = [
  e("standing", "Standing, arms relaxed."),
  e("holding-phone", "Standing, looking at a phone held at chest height."),
  e("phone-to-ear", "On a call, phone held to the ear."),
  e("walking", "Mid-stride. Best from the side."),
  e("sitting", "Seated on a chair, sofa or seat, hands on lap."),
  e("sitting-laptop", "Seated, typing on a laptop or at a desk."),
  e("driving", "Seated, hands on the steering wheel. Use in the car scene."),
  e("waving", "One arm raised, waving hello or flagging someone."),
  e("pointing", "Arm extended, pointing at something."),
  e("shrugging", "Both palms up: 'I don't know' / 'what now?'."),
  e("arms-crossed", "Arms folded: waiting, skeptical, impatient."),
] as const;

export const MOODS = [
  e("neutral", "Calm, default."),
  e("happy", "Smiling."),
  e("excited", "Big smile, eyebrows up."),
  e("focused", "Concentrating, slight frown."),
  e("confused", "One eyebrow up, wavy mouth."),
  e("impatient", "Flat mouth, narrowed eyes."),
  e("frustrated", "Frown, angled brows."),
  e("stressed", "Frown plus sweat drop."),
  e("sad", "Downturned mouth and brows."),
  e("surprised", "Open mouth, raised brows."),
  e("relieved", "Soft smile, closed eyes."),
  e("tired", "Half-closed eyes, flat mouth."),
] as const;

export const ANGLES = [
  e("front", "Facing the viewer."),
  e("three-quarter", "Turned slightly (default for most panels)."),
  e("side", "Profile. Use `facing` to choose left or right."),
  e("back", "From behind. Pairs with over-the-shoulder shots."),
] as const;

export const DEVICES = [
  e("phone", "Smartphone. Can be held (character.device) or placed. Set \"product\": false for a personal phone (call, text) so it isn't drawn as the product."),
  e("tablet", "Tablet, held in two hands or on a table."),
  e("laptop", "Laptop, open on a desk or lap."),
  e("desktop", "Desktop monitor on a desk."),
  e("watch", "Smartwatch on the wrist."),
  e("car-display", "In-car infotainment screen on the dashboard."),
  e("tv", "Television on a wall or stand."),
  e("smart-speaker", "Voice assistant speaker (no screen; pair with speech bubbles)."),
  e("kiosk", "Self-service kiosk or ordering screen."),
  e("payment-terminal", "Card reader at a checkout."),
] as const;

/** Devices a person can hold. Everything else (kiosk, car display, TV…) is placed in the scene. */
export const HANDHELD = ["phone", "tablet", "laptop", "watch"] as const;

export const BUBBLES = [
  e("speech", "Someone says something out loud."),
  e("thought", "What they're thinking. The unsaid frustrations are often the insight."),
  e("shout", "Loud, urgent or angry speech (spiky bubble)."),
  e("whisper", "Quiet speech (dashed outline)."),
] as const;

export const GESTURES = [
  e("tap", "Finger tap on a screen (teal ripple)."),
  e("double-tap", "Two quick taps."),
  e("long-press", "Press and hold (teal ring)."),
  e("swipe", "Swipe across the screen. Set `direction`: left, right, up, down."),
  e("cursor", "Mouse pointer on a desktop or laptop screen."),
  e("click", "Mouse click (cursor + burst)."),
  e("typing", "Typing marks near the keyboard or screen."),
  e("notification", "Device wiggle marks and a badge: a buzz or ping."),
  e("voice", "Sound waves coming from a device, e.g. a smart speaker or car answering."),
] as const;

export const SKIN = [
  e("tone-1", "Lightest skin tone."),
  e("tone-2", "Light-medium skin tone."),
  e("tone-3", "Medium-dark skin tone."),
  e("tone-4", "Darkest skin tone."),
] as const;

export const HAIR = [
  e("short", "Short, side-swept."),
  e("bun", "Hair up in a bun."),
  e("long", "Long, past the shoulders."),
  e("curly", "Curly, voluminous."),
  e("afro", "Rounded afro."),
  e("ponytail", "Pulled back in a ponytail."),
  e("buzz", "Buzz cut."),
  e("bald", "No hair."),
  e("hijab", "Head covering (hijab)."),
] as const;

export const HAIR_SHADE = [e("dark", "Dark hair."), e("light", "Light hair."), e("grey", "Grey or white hair.")] as const;

export const BODY = [
  e("slim", "Narrow build."),
  e("average", "Default build."),
  e("broad", "Broad shoulders."),
  e("plus", "Larger build."),
] as const;

export const OUTFITS = [
  e("jacket", "Casual jacket."),
  e("tee", "T-shirt."),
  e("hoodie", "Hoodie."),
  e("sweater", "Sweater."),
  e("suit", "Blazer and shirt."),
  e("dress", "Dress."),
  e("scrubs", "Medical scrubs."),
  e("apron", "Work apron (barista, shop staff)."),
] as const;

export const AGES = [e("child", "Kid, shorter."), e("adult", "Default."), e("older", "Older adult.")] as const;

export const ACCESSORIES = [
  e("glasses", "Glasses."),
  e("headphones", "Over-ear headphones."),
  e("bag", "Shoulder bag."),
  e("backpack", "Backpack."),
  e("cane", "Walking cane."),
  e("wheelchair", "Uses a wheelchair (poses render seated in the chair)."),
  e("beard", "Beard."),
] as const;

export const TIME_ICONS = [e("clock", "Clock face."), e("calendar", "Calendar page."), e("sun", "Morning / daytime."), e("moon", "Night.")] as const;
export const DIRECTIONS = ["left", "right", "up", "down"] as const;
export const FACING = ["left", "right"] as const;
export const PANEL_TYPES = [
  e("scene", "A moment: scene + shot + characters + devices + bubbles (default)."),
  e("title", "Title card: story title and subtitle."),
  e("time", "Time passes card: '12 minutes later…'."),
  e("text", "Narration card: a short line of text on its own."),
] as const;

export const VOCAB = {
  scenes: SCENES, shots: SHOTS, poses: POSES, moods: MOODS, angles: ANGLES, devices: DEVICES,
  bubbles: BUBBLES, gestures: GESTURES, skin: SKIN, hair: HAIR, "hair-shade": HAIR_SHADE, body: BODY,
  outfits: OUTFITS, ages: AGES, accessories: ACCESSORIES, "time-icons": TIME_ICONS, "panel-types": PANEL_TYPES,
} as const;

export type VocabCategory = keyof typeof VOCAB;
export const ids = (list: readonly Entry[]) => list.map((x) => x.id);

type Ids<T extends readonly Entry[]> = T[number]["id"];
export type SceneId = Ids<typeof SCENES>;
export type Shot = Ids<typeof SHOTS>;
export type Pose = Ids<typeof POSES>;
export type Mood = Ids<typeof MOODS>;
export type Angle = Ids<typeof ANGLES>;
export type DeviceType = Ids<typeof DEVICES>;
export type BubbleType = Ids<typeof BUBBLES>;
export type GestureType = Ids<typeof GESTURES>;
export type Skin = Ids<typeof SKIN>;
export type Hair = Ids<typeof HAIR>;
export type HairShade = Ids<typeof HAIR_SHADE>;
export type Body = Ids<typeof BODY>;
export type Outfit = Ids<typeof OUTFITS>;
export type Age = Ids<typeof AGES>;
export type Accessory = Ids<typeof ACCESSORIES>;
export type TimeIcon = Ids<typeof TIME_ICONS>;
