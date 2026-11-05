# UCDraw

 A minimalist use-case diagram editor that runs entirely in the browser.
 The diagram is described in text, and the visual diagram is built
  automatically on the right. The result can be exported to the
  editable `.drawio` format, or saved as a `.png` image.

  Try the hosted version: <https://dan260.github.io/ucdraw/>.

  ## Features

  - The text is the single source of the diagram. No manual layout needed.
  - Use cases are drawn as ellipses, actors as stick figures. Actors
    always sit in one zone at a single side of the diagram.
   - Systems (`system Name { … }`) group their use cases into a frame.
    Links are associations — the references inside an actor block — and
    generalizations, declared with `actor … extends …`.
  - Names use letters, digits and `_`, or are wrapped in double quotes to
    allow spaces and other characters.
 - Horizontal or vertical layout; system frames on or off — a settings
   control in the preview panel.
 - Export to `.drawio` (draw.io / diagrams.net) or to `.png`.
 - Save the schema to a file and load it from a file (`.uc`).
 - Autosaving of the text in `localStorage`.
 - Zoom, panning, and automatic fitting of the diagram.
 - Clicking a use case or actor highlights it with its relations and
   moves the editor caret there.
 - English and Russian interfaces (English by default).
 - Light and dark appearance, with a "follow the system" option.
 - Syntax highlighting in the editor.
 - Automatic bracket pairing: type `{`, the closing partner is added and
   the caret stays between them.
 - `Tab` / `Shift+Tab` indent and outdent, including whole selections.
 - No server, no build step, no external dependencies.

 ## Running

 Double-click `index.html` — the app works directly from the file
 without a build step or a local server.

 If the browser restricts `localStorage` for `file://`, or you want an
 environment as close as possible to a hosted page, start a static
 server:

 ```bash
 python3 -m http.server 8080
 ```

 Then open <http://localhost:8080>. Any other static server works too,
 e.g. `npx serve .`.

 ## Interface language

 The language selector lives in the header, next to the theme selector.
 The default is English; the choice is stored in `localStorage`, along
 with the schema. Switching immediately re-localizes the interface,
 error messages, and diagnostics.

 ## Appearance

 The theme selector switches the interface between **Light** and
 **Dark**, or follows the operating system with **System** (the
 default). The choice is remembered and applied before the first paint,
  so there is no flash of the wrong theme. The SVG palette of the use
  cases is independent of the theme and stays the same in both; the
  "Use case colors" setting switches between one color per use case and
  a single color for all of them.

   The editor highlights the `system` / `actor` / `extends` keywords,
   names (including `System.Name` path references), braces, and `#` /
   `//` comments, and keeps the line numbers and the highlighted layer
   in sync with the text.

  ## Syntax

  ```text
  # An online shop, the quick version

  system Shop {
    "Place Order"
    "Take Payment"
    "Ship Order"
  }

  Support

   actor Customer {
    Shop."Place Order"
    Shop."Take Payment"
    Support
   }

   actor Courier {
    Shop."Ship Order"
   }

   actor SupportLead extends Support {
    Shop."Place Order"
   }
   ```

  - `system Name { … }` — a system boundary. Its body lists use case
    names, one per line; on the canvas they are wrapped into a frame.
    `system Name {}` declares an empty system.
   - `actor Name { … }` — an actor, drawn as a stick figure. Its body
    lists, one per line, the use cases the actor plays as `System.Name`
    paths, plus the plain names of other actors. Each reference becomes
    an association. `actor Name {}` declares an actor without any.
   - `actor Name extends Super` — generalization: a hollow arrow from
    `Name` to `Super`. The extending actor plays everything the
    extended actor plays, plus its own references. The extended actor
    must be declared earlier, and `Super` must be another actor.
   - `Name` — a use case, drawn as an ellipse. A bare name in a system
     body belongs to that system; a bare name on its own, at the top
     level, is a use case outside any system. There is no `usecase`
     keyword — a use case is always just its name.
  - `System.Name` — the path to a use case inside a system. The only
    way to point at one: a use case that lives in a system is not part
    of the top-level namespace.
  - Names use letters, digits and `_`. To allow spaces or other
    characters, wrap the name in double quotes; in a path, quote each
    segment (`"My Shop"."Place Order"`). The dot itself never goes
    inside the quotes.
  - Use case names are unique *per system* (or at the top level) — the
    same name may appear in different systems. Actor names and free
    use case names share the top-level namespace and must be unique
    there.
  - Lines starting with `#` or `//` are comments.

 ## Files

 The schema is plain text and can be stored in a file with the `.uc`
 extension.

 - The **Save** / **Open** buttons in the editor footer write the
   current text to `usecase-diagram.uc` and read it back.
 - `Ctrl/Cmd + S` saves the schema to a file.

 Loaded content goes through the same pipeline as typed text: it is
 parsed, validated, and autosaved. Files larger than 1 MB or with
 binary content are rejected with a notification.

 ## Diagram controls

 - Mouse wheel — zoom.
 - Dragging the background — panning.
 - Double-click on the canvas — fit the diagram.
 - Clicking a use case or actor highlights it and its relations and
   moves the editor caret to its declaration.
 - `Tab` in the editor — indent the caret line, or every line of a
   selection. `Shift+Tab` — the reverse.
 - `Ctrl/Cmd + E` — export `.drawio`.
 - `Ctrl/Cmd + Shift + E` — export `.png`.
 - **Save** / **Open** buttons in the editor footer — write the schema
   to a `.uc` file and load it from a file.
 - `Ctrl/Cmd + S` — save the schema to a file.
   - The gear button in the preview panel — layout direction, system
    frames, and use case colors (each use case in its own color, or
    all of them in one).

 ## Tests

 ```bash
 npm test
 ```

 The tests use the built-in Node.js test runner and need no
 dependencies.

 ## Structure

 ```text
 index.html          application interface
 styles.css          styling
 src/app.js          application state and interactions
 src/i18n.js         interface strings (en/ru)
 src/parser.js       text schema parser
 src/layout.js       automatic layout
 src/render.js       SVG rendering
 src/drawio.js       .drawio generation
 src/png.js          .png rendering
 src/theme.js        diagram palette
 src/highlight.js    editor syntax highlighting
 src/appearance.js   light/dark/system theme
  src/settings.js     user settings (layout, frames, use case colors)
 test/               unit tests
 scripts/            source loader for tests
 assets/             favicon
 ```

 ## License

 [MIT](LICENSE) — Copyright (c) 2026 dan260.
