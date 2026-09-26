# Storyboard vocabulary

Generated from the tool. Query live with `sb vocab <category> [--grep text]`.

## scenes

Field: panel `scene`

- `coffee-shop`: Counter, menu board, espresso machine, barista. Marks: counter, barista (behind the counter), queue, table, door. Marks: `counter`, `barista`, `queue`, `table`, `door`.
- `kitchen`: Home kitchen with counter, fridge, window. Marks: counter, fridge, table. Marks: `counter`, `fridge`, `table`.
- `living-room`: Sofa, lamp, TV on the wall. Marks: sofa, tv, floor. Marks: `sofa`, `tv`, `floor`.
- `bedroom`: Bed, nightstand, window at night or morning. Marks: bed, nightstand, door. Marks: `bed`, `nightstand`, `door`.
- `office`: Desk with monitor, chair, plant, window. Marks: desk, chair, window, door. Marks: `desk`, `chair`, `window`, `door`.
- `meeting-room`: Table, whiteboard, wall screen. Marks: table-left, table-right, whiteboard, screen. Marks: `table-left`, `table-right`, `whiteboard`, `screen`.
- `car`: Car interior from the side: seat, wheel, dashboard display. Marks: driver-seat, passenger-seat, dashboard. Marks: `driver-seat`, `passenger-seat`, `dashboard`.
- `street`: Sidewalk, storefronts, lamp post, curb. Marks: sidewalk, curb, storefront, crossing. Marks: `sidewalk`, `curb`, `storefront`, `crossing`.
- `transit`: Bus or train interior: seats, pole, windows. Marks: seat, standing, door. Marks: `seat`, `standing`, `door`.
- `store`: Shop checkout: counter, shelves, payment terminal. Marks: checkout, cashier (behind the counter), aisle, entrance. Marks: `checkout`, `cashier`, `aisle`, `entrance`.
- `hospital`: Ward with a patient bed, IV pole and nurses' station. Marks: bed, bedside, corridor, station (behind the counter). Marks: `bed`, `bedside`, `corridor`, `station`.
- `school`: School entrance: fence, gate, doors, sign. Marks: sidewalk, gate, door. Marks: `sidewalk`, `gate`, `door`.
- `airport`: Gate seating, departure board, check-in counter, plane in the window. Marks: check-in, agent (behind the counter), gate-seat, window. Marks: `check-in`, `agent`, `gate-seat`, `window`.
- `restaurant`: Table for two, pendant lights, waiter. Marks: table-left, table-right, waiter, door. Marks: `table-left`, `table-right`, `waiter`, `door`.
- `gym`: Treadmill, weights rack, bench, mirror. Marks: floor, treadmill, bench, mirror. Marks: `floor`, `treadmill`, `bench`, `mirror`.
- `clinic`: Doctor's waiting room with reception desk. Marks: waiting (seated), reception, receptionist (behind the desk), door. Marks: `waiting`, `reception`, `receptionist`, `door`.
- `parking`: Parking garage: parked car, EV charger, pillar. Marks: car-door, charger, walkway. Marks: `car-door`, `charger`, `walkway`.
- `bus-stop`: Bus shelter with bench, schedule and sign. Marks: bench, shelter, sidewalk, curb. Marks: `bench`, `shelter`, `sidewalk`, `curb`.
- `park`: Trees, a bench and a path. Marks: bench, path, tree. Marks: `bench`, `path`, `tree`.
- `home-office`: Desk at home by a window, bookshelf. Marks: desk-chair, bookshelf, door. Marks: `desk-chair`, `bookshelf`, `door`.
- `hotel`: Front desk with bell, elevator, luggage cart. Marks: desk, clerk (behind the desk), lobby, elevator. Marks: `desk`, `clerk`, `lobby`, `elevator`.
- `classroom`: Whiteboard, desks, clock. Marks: desk, back-row, teacher, board. Marks: `desk`, `back-row`, `teacher`, `board`.
- `blank`: Empty panel with a floor line. Marks: left, center, right. Marks: `left`, `center`, `right`.

## shots

Field: panel `shot`

- `wide`: Establishing shot: the whole scene, people full-body. Use it to show where they are and what else is going on.
- `medium`: Waist-up on the focus character (or two characters). Body language and what's in their hands.
- `close-up`: Face fills the panel. Emotion: frustration, relief, confusion.
- `over-the-shoulder`: From behind the character, looking at their device. What they see and how they react.
- `screen`: The device fills the panel, held in a hand. Use when the UI itself is the point.
- `pov`: First person: two hands holding the device, as if you are them.

## poses

Field: character `pose`

- `standing`: Standing, arms relaxed.
- `holding-phone`: Standing, looking at a phone held at chest height.
- `phone-to-ear`: On a call, phone held to the ear.
- `walking`: Mid-stride. Best from the side.
- `sitting`: Seated on a chair, sofa or seat, hands on lap.
- `sitting-laptop`: Seated, typing on a laptop or at a desk.
- `driving`: Seated, hands on the steering wheel. Use in the car scene.
- `waving`: One arm raised, waving hello or flagging someone.
- `pointing`: Arm extended, pointing at something.
- `shrugging`: Both palms up: 'I don't know' / 'what now?'.
- `arms-crossed`: Arms folded: waiting, skeptical, impatient.

## moods

Field: character `mood`

- `neutral`: Calm, default.
- `happy`: Smiling.
- `excited`: Big smile, eyebrows up.
- `focused`: Concentrating, slight frown.
- `confused`: One eyebrow up, wavy mouth.
- `impatient`: Flat mouth, narrowed eyes.
- `frustrated`: Frown, angled brows.
- `stressed`: Frown plus sweat drop.
- `sad`: Downturned mouth and brows.
- `surprised`: Open mouth, raised brows.
- `relieved`: Soft smile, closed eyes.
- `tired`: Half-closed eyes, flat mouth.

## angles

Field: character `angle`

- `front`: Facing the viewer.
- `three-quarter`: Turned slightly (default for most panels).
- `side`: Profile. Use `facing` to choose left or right.
- `back`: From behind. Pairs with over-the-shoulder shots.

## devices

Field: `device` / `devices[].type`

- `phone`: Smartphone. Can be held (character.device) or placed. Set "product": false for a personal phone (call, text) so it isn't drawn as the product.
- `tablet`: Tablet, held in two hands or on a table.
- `laptop`: Laptop, open on a desk or lap.
- `desktop`: Desktop monitor on a desk.
- `watch`: Smartwatch on the wrist.
- `car-display`: In-car infotainment screen on the dashboard.
- `tv`: Television on a wall or stand.
- `smart-speaker`: Voice assistant speaker (no screen; pair with speech bubbles).
- `kiosk`: Self-service kiosk or ordering screen.
- `payment-terminal`: Card reader at a checkout.

## bubbles

Field: `bubbles[].type`

- `speech`: Someone says something out loud.
- `thought`: What they're thinking. The unsaid frustrations are often the insight.
- `shout`: Loud, urgent or angry speech (spiky bubble).
- `whisper`: Quiet speech (dashed outline).

## gestures

Field: `gestures[].type`

- `tap`: Finger tap on a screen (teal ripple).
- `double-tap`: Two quick taps.
- `long-press`: Press and hold (teal ring).
- `swipe`: Swipe across the screen. Set `direction`: left, right, up, down.
- `cursor`: Mouse pointer on a desktop or laptop screen.
- `click`: Mouse click (cursor + burst).
- `typing`: Typing marks near the keyboard or screen.
- `notification`: Device wiggle marks and a badge: a buzz or ping.
- `voice`: Sound waves coming from a device, e.g. a smart speaker or car answering.

## skin

Field: cast `skin`

- `tone-1`: Lightest skin tone.
- `tone-2`: Light-medium skin tone.
- `tone-3`: Medium-dark skin tone.
- `tone-4`: Darkest skin tone.

## hair

Field: cast `hair`

- `short`: Short, side-swept.
- `bun`: Hair up in a bun.
- `long`: Long, past the shoulders.
- `curly`: Curly, voluminous.
- `afro`: Rounded afro.
- `ponytail`: Pulled back in a ponytail.
- `buzz`: Buzz cut.
- `bald`: No hair.
- `hijab`: Head covering (hijab).

## hair-shade

Field: cast `hairShade`

- `dark`: Dark hair.
- `light`: Light hair.
- `grey`: Grey or white hair.

## body

Field: cast `body`

- `slim`: Narrow build.
- `average`: Default build.
- `broad`: Broad shoulders.
- `plus`: Larger build.

## outfits

Field: cast `outfit`

- `jacket`: Casual jacket.
- `tee`: T-shirt.
- `hoodie`: Hoodie.
- `sweater`: Sweater.
- `suit`: Blazer and shirt.
- `dress`: Dress.
- `scrubs`: Medical scrubs.
- `apron`: Work apron (barista, shop staff).
- `polo`: Collared polo shirt (retail, delivery, tech support, golf).
- `uniform`: Dark uniform with a badge (police, security, pilot, transit, parking).
- `hi-vis`: Safety vest with reflective stripes (warehouse, construction, road crew).
- `lab-coat`: Long white coat (doctor, pharmacist, scientist, vet).
- `chef`: White double-breasted chef's jacket (cook, kitchen staff).
- `overalls`: Bib overalls (mechanic, farmer, painter, trades).
- `coat`: Long winter coat (commuter, outdoors).
- `athletic`: Tank top and shorts (runner, gym, coach).

## hats

Field: cast `hat`

- `cap`: Baseball cap (casual, delivery driver, coach).
- `beanie`: Knit beanie (cold weather, casual).
- `hard-hat`: Hard hat (construction, warehouse, site visit).
- `chef-hat`: Tall chef's toque.
- `uniform-cap`: Peaked cap (police, pilot, security, driver).
- `sun-hat`: Wide-brim sun hat.
- `surgical-cap`: Surgical scrub cap (nurse, surgeon).

## ages

Field: cast `age`

- `child`: Kid, shorter.
- `adult`: Default.
- `older`: Older adult.

## accessories

Field: cast `accessories` (array)

- `glasses`: Glasses.
- `headphones`: Over-ear headphones.
- `bag`: Shoulder bag.
- `backpack`: Backpack.
- `cane`: Walking cane.
- `wheelchair`: Uses a wheelchair (poses render seated in the chair).
- `beard`: Beard.

## time-icons

Field: time panel `icon`

- `clock`: Clock face.
- `calendar`: Calendar page.
- `sun`: Morning / daytime.
- `moon`: Night.

## panel-types

Field: panel `type`

- `scene`: A moment: scene + shot + characters + devices + bubbles (default).
- `title`: Title card: story title and subtitle.
- `time`: Time passes card: '12 minutes later…'.
- `text`: Narration card: a short line of text on its own.

## shapes

Field: `shapes[].type`

- `rect`: Box. `points`: two opposite corners [[x1,y1],[x2,y2]].
- `ellipse`: Circle or oval inside the box given by two corners.
- `line`: Straight line between two points.
- `arrow`: Line with an arrowhead at the second point.
- `path`: Freehand line through every point (sketch anything missing).

## shape-fills

Field: `shapes[].fill`

- `none`: Outline only (default for lines).
- `light`: Light grey.
- `mid`: Mid grey.
- `dark`: Dark grey.
