'use strict';

const I18N = (() => {
  function fillTemplate(template, params = {}) {
    return template.replace(/\{(\w+)\}/g, (match, name) =>
      Object.prototype.hasOwnProperty.call(params, name)
        ? String(params[name])
        : match,
    );
  }

  const MESSAGES = {
    en: {
      title: 'UCDraw — use case diagrams from text',
      'meta.description':
        'Create UML use case diagrams from text and export them to .drawio or .png. Works entirely in your browser.',
      'brand.aria': 'UCDraw — go home',
      'brand.tagline': 'text → diagram',
      'language.aria': 'Language',
      'theme.aria': 'Theme',
      'theme.option.system': 'System',
      'theme.option.light': 'Light',
      'theme.option.dark': 'Dark',
      'header.syntax': 'Syntax',
      'header.syntax.title': 'Schema syntax',
      'header.export': 'Export',
      'editor.title': 'Schema',
      'diagram.title': 'Preview',
      'editor.aria': 'Text description of a use case diagram',
      'editor.hint':
        'actor Customer { Shop.Order · Courier } — paths, then actor names',
      'editor.save.initial': 'Local autosave',
      'editor.save.saving': 'Saving…',
      'editor.save.saved': 'Saved locally',
      'editor.save.unavailable': 'Saving unavailable',
      'diagnostics.title': 'Schema errors',
      'status.ready': 'Ready',
      'status.empty': 'Empty',
      'export.title.invalid': 'Fix the schema errors first',
      'export.title.empty': 'Add at least one use case or actor',
      'export.title.ready': 'Download the diagram as .drawio',
      'export.title.readyPng': 'Download the diagram as .png',
      'toast.exported': 'Downloaded ucdraw-diagram.drawio',
      'toast.pngExported': 'Downloaded ucdraw-diagram.png',
      'toast.pngFailed': 'Could not render the diagram as .png',
      'toast.notReady': 'The diagram is not ready for export',
      'toast.example': 'Example inserted',
      'file.save': 'Save',
      'file.open': 'Open',
      'file.saveTitle': 'Save the schema to a file',
      'file.openTitle': 'Load a schema from a file',
      'file.saved': 'Saved {name}',
      'file.loaded': 'Loaded {name}',
      'file.loadError': "Couldn't read the file",
      'file.tooLarge': 'The file is too large',
      'diagnostic.line': 'Line {line}',
      'settings.title': 'Diagram settings',
      'settings.aria': 'Diagram settings',
      'settings.layout': 'Layout',
      'settings.layout.h': 'Horizontal',
      'settings.layout.v': 'Vertical',
      'settings.systems': 'Systems',
      'settings.systems.box': 'Box',
      'settings.systems.none': 'None',
      'settings.useCaseColors': 'Use case colors',
      'settings.useCaseColors.vary': 'Different',
      'settings.useCaseColors.uniform': 'Same',
      'zoom.group': 'Diagram zoom',
      'zoom.out': 'Zoom out',
      'zoom.in': 'Zoom in',
      'zoom.fit': 'Fit',
      'zoom.fit.title': 'Fit diagram (double-click the canvas)',
      'diagram.fullscreen.enter': 'View the preview full-screen',
      'diagram.fullscreen.exit': 'Exit full-screen',
      'canvas.hint': 'Wheel — zoom · double-click — fit',
      'canvas.stale': 'Showing the last valid diagram',
      'canvas.legend.aria': 'Relation legend',
       'canvas.legend.title': 'Links',
       'canvas.legend.association': 'association',
       'canvas.legend.generalization': 'generalization',
      'canvas.empty.title': 'Your diagram appears here',
      'canvas.empty.text':
        'Describe use cases and actors in the editor — the preview updates automatically.',
      'canvas.empty.example': 'Insert example',
      'canvas.error.title': 'The diagram is not ready yet',
      'canvas.error.text':
        'Fix the errors in the text — the preview updates automatically.',
      'canvas.now.title': 'Nothing here yet',
      'canvas.now.text':
        'Describe your first use case in the editor — or insert a ready-made example.',
      'help.title': 'Schema syntax',
      'help.close': 'Close',
      'help.lead':
        'The whole diagram is described in text. The preview is rebuilt as you type.',
      'help.code.system': 'system Shop { … }',
      'help.rule.system':
        'A system boundary. Its body lists use case names — they are grouped into a frame on the canvas.',
      'help.code.usecase': 'Browse',
      'help.rule.usecase':
        'A use case, drawn as an ellipse. It is always just a name: in a system body, or alone at the top level.',
       'help.code.actor': 'actor Customer { Shop.Order }',
       'help.rule.actor':
         'An actor, drawn as a stick figure. Its body lists the use cases it plays as System.Name paths, and names of other actors.',
       'help.code.actorExtends': 'actor Admin extends User',
       'help.rule.actorExtends':
         'Specialization: a hollow arrow from the extending actor to the extended one. The extending actor plays everything the extended actor plays, plus its own references.',
      'help.code.reference': 'Shop.Order',
      'help.rule.reference':
        'A use case inside a system is referenced by path: Shop.Order. Quoted names may contain spaces: "My Shop"."Place Order".',
      'help.code.name': '"Place Order"',
      'help.rule.name':
        'Names use letters, digits and “_”. To allow spaces, wrap the name in quotes.',
      'help.code.comment': '# comment',
      'help.rule.comment':
        'Lines that start with <code>#</code> or <code>//</code> are ignored.',
      'help.example.title': 'example',
      'help.example.sub': 'systems, actors and their references',
      'help.example.note':
        'Each <code>system</code> body lists its use case names; each <code>actor</code> body lists what the actor plays. There is no <code>rel</code> — a reference inside an actor <em>is</em> the link, and <code>extends</code> draws a generalization arrow.',
      'help.tip.title': 'Export',
      'help.tip.text':
        'The “Export .drawio” button downloads an editable diagram you can open in draw.io or diagrams.net, and “Export .png” saves the drawing as an image.',
      'help.footer': 'Everything runs locally in your browser.',
      'help.gotIt': 'Got it',
      'noscript': 'UCDraw needs JavaScript to work.',
      'usecases.one': '{count} use case',
      'usecases.other': '{count} use cases',
      'actors.one': '{count} actor',
      'actors.other': '{count} actors',
       'associations.one': '{count} association',
       'associations.other': '{count} associations',
       'generalizations.one': '{count} generalization',
       'generalizations.other': '{count} generalizations',
      'errors.one': '{count} error',
      'errors.other': '{count} errors',
      'kind.usecase': 'use case',
      'kind.actor': 'actor',
      'kind.system': 'system',
      'diag.unknownDeclaration':
        'Expected a “system” or “actor” block, or a use case name.',
      'diag.usecaseKeyword':
        'The “usecase” keyword was removed — write the use case name alone.',
      'diag.blockTail':
        'Write “{” right after the name — or “{}” for an empty block.',
      'diag.missingBrace': 'The {kind} “{name}” needs a “{” — a block body.',
      'diag.strayClosing': 'A closing brace without an open block.',
      'diag.strayOpening': 'An unexpected opening brace.',
      'diag.textAfterClosing': 'Nothing should follow “}”.',
      'diag.nameInvalid':
        'Names use letters, digits and “_”, or are wrapped in quotes.',
      'diag.nameEmpty': 'The name cannot be empty.',
      'diag.duplicate': 'The {kind} “{name}” is already declared{where}.',
      'diag.duplicateWhere': ' in the “{system}” system',
      'diag.systemBody':
        'Inside a system, write use case names only — one per line.',
      'diag.systemUsecaseKeyword':
        'A system already implies use cases — drop the “usecase” keyword.',
      'diag.actorBody':
        'Inside an actor block, write use case paths like “Shop.Order”, or the names of other actors.',
      'diag.pathTooDeep':
        '“{name}” is not a valid reference — use a name or “System.Name”.',
      'diag.pathAtTopLevel':
        '“{system}.{name}” is a path for an actor block — at the top level write the use case name alone.',
      'diag.pathUnknownSystem': 'The “{name}” system is not declared.',
      'diag.pathNoUseCase':
        '“{name}” is not a use case of the “{system}” system.',
      'diag.nameNeedsPath':
        'The bare name “{name}” cannot be resolved — write one of: {paths}.',
       'diag.referenceUnknown':
         'The actor references “{name}”, which is not declared.',
       'diag.referenceSelf': 'An actor cannot reference itself.',
       'diag.associationDuplicate': 'This association is already declared.',
       'diag.extendsUnknown':
         'The actor “{actor}” extends “{name}”, which is not declared.',
       'diag.extendsSelf': 'An actor cannot extend itself.',
       'diag.extendsNotActor':
         'The actor “{actor}” extends “{name}”, which is not an actor.',
       'diag.extendsSyntax':
         'After “extends” write the name of the extended actor — then “{” or “{}”.',
      'diag.unclosedEnd': 'The {kind} “{name}” is not closed: add “}”.',
      'render.useCaseAria': 'Use case {name}',
      'render.actorAria': 'Actor {name}',
      'render.diagramAria': 'Use case diagram: {n} use cases, {m} actors',
       'render.assocTooltip': '{source} — {target}',
       'render.genTooltip': '{source} extends {target}',
       'example.title': '# Example: an online shop',
      'example.relations':
        '# Actor bodies list what they play — System.Name paths',
      'example.deps': '# Paths point at use cases inside systems',
    },
    ru: {
      title: 'UCDraw — use-диаграммы из текста',
      'meta.description':
        'UCDraw — создание UML use-диаграмм из текста с экспортом в .drawio или .png. Работает полностью в браузере.',
      'brand.aria': 'UCDraw — на главную',
      'brand.tagline': 'текст → диаграмма',
      'language.aria': 'Язык',
      'theme.aria': 'Тема',
      'theme.option.system': 'Системная',
      'theme.option.light': 'Светлая',
      'theme.option.dark': 'Тёмная',
      'header.syntax': 'Синтаксис',
      'header.syntax.title': 'Синтаксис схемы',
      'header.export': 'Экспорт',
      'editor.title': 'Схема',
      'diagram.title': 'Предпросмотр',
      'editor.aria': 'Текстовое описание use-диаграммы',
      'editor.hint':
        'actor Customer { Shop.Order · Courier } — сначала пути, потом актёры',
      'editor.save.initial': 'Локальное сохранение',
      'editor.save.saving': 'Сохраняем…',
      'editor.save.saved': 'Сохранено локально',
      'editor.save.unavailable': 'Сохранение недоступно',
      'diagnostics.title': 'Ошибки в схеме',
      'status.ready': 'Готово',
      'status.empty': 'Пусто',
      'export.title.invalid': 'Сначала исправьте ошибки в схеме',
      'export.title.empty': 'Добавьте хотя бы один кейс или актёр',
      'export.title.ready': 'Скачать диаграмму в формате .drawio',
      'export.title.readyPng': 'Скачать диаграмму в формате .png',
      'toast.exported': 'Файл ucdraw-diagram.drawio скачан',
      'toast.pngExported': 'Файл ucdraw-diagram.png скачан',
      'toast.pngFailed': 'Не удалось отрисовать диаграмму в .png',
      'toast.notReady': 'Схема пока не готова к экспорту',
      'toast.example': 'Пример загружен',
      'file.save': 'Сохранить',
      'file.open': 'Открыть',
      'file.saveTitle': 'Сохранить схему в файл',
      'file.openTitle': 'Загрузить схему из файла',
      'file.saved': 'Сохранено: {name}',
      'file.loaded': 'Загружено: {name}',
      'file.loadError': 'Не удалось прочитать файл',
      'file.tooLarge': 'Файл слишком большой',
      'diagnostic.line': 'Строка {line}',
      'settings.title': 'Настройки диаграммы',
      'settings.aria': 'Настройки диаграммы',
      'settings.layout': 'Раскладка',
      'settings.layout.h': 'Горизонт.',
      'settings.layout.v': 'Вертик.',
      'settings.systems': 'Системы',
      'settings.systems.box': 'Кадр',
      'settings.systems.none': 'Без кадра',
      'settings.useCaseColors': 'Цвета кейсов',
      'settings.useCaseColors.vary': 'Разные',
      'settings.useCaseColors.uniform': 'Один',
      'zoom.group': 'Масштаб диаграммы',
      'zoom.out': 'Уменьшить',
      'zoom.in': 'Увеличить',
      'zoom.fit': 'Вписать',
      'zoom.fit.title': 'Вписать диаграмму (двойной клик по полю)',
      'diagram.fullscreen.enter': 'Открыть предпросмотр на весь экран',
      'diagram.fullscreen.exit': 'Выйти с полного экрана',
      'canvas.hint': 'Колесо — масштаб · двойной клик — вписать',
      'canvas.stale': 'Показана последняя корректная схема',
      'canvas.legend.aria': 'Обозначения связей',
      'canvas.legend.title': 'Связи',
       'canvas.legend.association': 'ассоциация',
       'canvas.legend.generalization': 'наследование',
      'canvas.empty.title': 'Здесь появится диаграмма',
      'canvas.empty.text':
        'Опишите кейсы и актёров в редакторе — предпросмотр обновится автоматически.',
      'canvas.empty.example': 'Вставить пример',
      'canvas.error.title': 'Диаграмма пока не готова',
      'canvas.error.text':
        'Исправьте ошибки в тексте — предпросмотр обновится автоматически.',
      'canvas.now.title': 'Пока пусто',
      'canvas.now.text':
        'Опишите первый кейс в редакторе — или вставьте готовый пример.',
      'help.title': 'Синтаксис схемы',
      'help.close': 'Закрыть',
      'help.lead':
        'Диаграмма целиком описывается текстом. Предпросмотр перестраивается на лету.',
      'help.code.system': 'system Shop { … }',
      'help.rule.system':
        'Граница системы. В теле перечисляются имена кейсов — на канве они объединяются кадром.',
      'help.code.usecase': 'Browse',
      'help.rule.usecase':
        'Use-кейс рисуется эллипсом. Это всегда просто имя: в теле системы или отдельно на верхнем уровне.',
      'help.code.actor': 'actor Customer { Shop.Order }',
       'help.rule.actor':
         'Актёр, рисуется палочной фигуркой. В теле перечисляются пути System.Name к выполняемым кейсам и имена других актёров.',
       'help.code.actorExtends': 'actor Admin extends User',
       'help.rule.actorExtends':
         'Специализация: линия с полым наконечником от производного акта к исходному. Admin делает всё то же, что User, плюс свои кейсы.',
      'help.code.reference': 'Shop.Order',
      'help.rule.reference':
        'Кейсы внутри системы ссылаются путём: Shop.Order. Имена в кавычках могут содержать пробелы: "My Shop"."Place Order".',
      'help.code.name': '"Place Order"',
      'help.rule.name':
        'Имена — из букв, цифр и «_». Чтобы разрешить пробелы, оберните имя в кавычки.',
      'help.code.comment': '# комментарий',
      'help.rule.comment':
        'Строки, начинающиеся с <code>#</code> или <code>//</code>, игнорируются.',
      'help.example.title': 'пример',
      'help.example.sub': 'системы, актёры и их ссылки',
      'help.example.note':
        'Каждое тело <code>system</code> перечисляет имена своих кейсов; тело <code>actor</code> — что актёр выполняет. Ключевого слова <code>rel</code> нет: ссылка внутри актёра — это и есть связь, а <code>extends</code> рисует стрелку наследования.',
      'help.tip.title': 'Экспорт',
      'help.tip.text':
        'Кнопка «Экспорт .drawio» скачивает редактируемую диаграмму для draw.io или diagrams.net, а «Экспорт .png» сохраняет её как картинку.',
      'help.footer': 'Всё работает локально в браузере.',
      'help.gotIt': 'Понятно',
      'noscript': 'Для работы UCDraw нужен JavaScript.',
      'usecases.one': '{count} кейс',
      'usecases.few': '{count} кейса',
      'usecases.many': '{count} кейсов',
      'actors.one': '{count} актёр',
      'actors.few': '{count} актёра',
      'actors.many': '{count} актёров',
       'associations.one': '{count} ассоциация',
       'associations.few': '{count} ассоциации',
       'associations.many': '{count} ассоциаций',
       'generalizations.one': '{count} наследование',
       'generalizations.few': '{count} наследования',
       'generalizations.many': '{count} наследований',
      'errors.one': '{count} ошибка',
      'errors.few': '{count} ошибки',
      'errors.many': '{count} ошибок',
      'kind.usecase': 'кейс',
      'kind.actor': 'актёр',
      'kind.system': 'система',
      'diag.unknownDeclaration':
        'Ожидался блок «system» или «actor» либо имя кейса.',
      'diag.usecaseKeyword':
        'Ключевое слово «usecase» убрано — напишите просто имя кейса.',
      'diag.blockTail':
        'После имени ставьте «{» — или «{}» для пустого блока.',
      'diag.missingBrace': '{kind} «{name}»: после имени нужна скобка «{».',
      'diag.strayClosing': 'Закрывающая скобка без открытого блока.',
      'diag.strayOpening': 'Лишняя открывающая скобка.',
      'diag.textAfterClosing': 'После «}» не должно быть текста.',
      'diag.nameInvalid':
        'Имена — из букв, цифр и «_» — либо оберните в кавычки.',
      'diag.nameEmpty': 'Имя не может быть пустым.',
      'diag.duplicate': 'Элемент {kind} «{name}» уже объявлен{where}.',
      'diag.duplicateWhere': ' в системе «{system}»',
      'diag.systemBody': 'Внутри системы — только имена кейсов, по одному в строке.',
      'diag.systemUsecaseKeyword':
        'Система сама по себе состоит из кейсов — слово «usecase» не нужно.',
      'diag.actorBody':
        'В теле актёра — пути вида «Shop.Order» или имена других актёров.',
      'diag.pathTooDeep':
        '«{name}» — некорректная ссылка: имя или «System.Name».',
      'diag.pathAtTopLevel':
        '«{system}.{name}» — путь для блока актёра; на верхнем уровне пишется только имя кейса.',
      'diag.pathUnknownSystem': 'Система «{name}» не объявлена.',
      'diag.pathNoUseCase':
        '«{name}» — не кейс системы «{system}».',
      'diag.nameNeedsPath':
        'Голое имя «{name}» не резолвится — напишите одно из: {paths}.',
      'diag.referenceUnknown':
        'Актёр ссылается на «{name}», которое не объявлено.',
       'diag.referenceSelf': 'Актёр не может ссылаться сам на себя.',
       'diag.associationDuplicate': 'Эта ассоциация уже объявлена.',
       'diag.extendsUnknown':
         'Актёр «{actor}» наследует «{name}», который не объявлен.',
       'diag.extendsSelf': 'Актёр не может наследовать сам себя.',
       'diag.extendsNotActor':
         'Актёр «{actor}» наследует «{name}», но это не актёр.',
       'diag.extendsSyntax':
         'После «extends» — имя наследуемого актёра, затем «{» или «{}».',
      'diag.unclosedEnd': 'Блок {kind} «{name}» не закрыт: добавьте «}».',
      'render.useCaseAria': 'Кейс «{name}»',
      'render.actorAria': 'Актёр «{name}»',
      'render.diagramAria': 'Use-диаграмма: {n} кейсов, {m} актёров',
       'render.assocTooltip': '{source} — {target}',
       'render.genTooltip': '«{source}» наследует «{target}»',
       'example.title': '# Пример: интернет-магазин',
      'example.relations':
        '# Тела актёров перечисляют, что они выполняют — пути System.Name',
      'example.deps': '# Пути указывают на кейсы внутри систем',
    },
  };

  let language = 'en';

  function lookup(key) {
    const table = MESSAGES[language] || MESSAGES.en;
    if (Object.prototype.hasOwnProperty.call(table, key)) return table[key];
    return MESSAGES.en[key];
  }

  function getLanguage() {
    return language;
  }

  function setLanguage(next) {
    if (MESSAGES[next]) language = next;
  }

  function t(key, params) {
    const template = lookup(key);
    if (template === undefined) return key;
    return fillTemplate(template, params);
  }

  function pluralCategory(count) {
    if (language === 'ru') {
      const mod10 = Math.abs(count) % 10;
      const mod100 = Math.abs(count) % 100;
      if (mod100 >= 11 && mod100 <= 14) return 'many';
      if (mod10 === 1) return 'one';
      if (mod10 >= 2 && mod10 <= 4) return 'few';
      return 'many';
    }
    return count === 1 ? 'one' : 'other';
  }

  function plural(count, base, params = {}) {
    const table = MESSAGES[language] || MESSAGES.en;
    const suffix = `.${pluralCategory(count)}`;
    let template = table[`${base}${suffix}`];
    if (template === undefined) template = MESSAGES.en[`${base}${suffix}`];
    if (template === undefined) template = MESSAGES.en[`${base}.one`];
    if (template === undefined) return String(count);
    return fillTemplate(template, { count, ...params });
  }

  return { getLanguage, setLanguage, t, plural, MESSAGES };
})();
