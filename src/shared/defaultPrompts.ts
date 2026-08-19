// Vorinstallierte Systemprompts (reine Daten – in Node testbar).
// Jeder Prompt nennt die Tools namentlich, legt das Ausgabeformat fest
// und verweist auf die UI-Sprache – damit das Modell sie zuverlässig umsetzt.
import type { Locale } from './i18n'

export interface PromptSeed {
  title: string
  prompt: string
}

export const DEFAULT_PROMPTS: Record<Locale, PromptSeed[]> = {
  de: [
    {
      title: 'Adresse in Formularen ausfüllen',
      prompt: 'Fülle die Adressfelder des Formulars auf der Seite mit den Adressdaten aus dem Kontext (markierter Ausschnitt oder Seiteninhalt). Nutze dafür fill_element mit passenden CSS-Selektoren für Name, Straße, PLZ, Ort und Land. Prüfe anschließend mit read_content, ob alle Pflichtfelder korrekt gefüllt sind, und ergänze fehlende Angaben. Antworte kurz in der Sprache der Oberfläche.',
    },
    {
      title: 'Korrektorat',
      prompt: 'Prüfe den markierten Text auf Rechtschreibung, Grammatik, Zeichensetzung und Stil. Korrigiere ihn und ersetze die Markierung durch die korrigierte Fassung (set_text ohne Selektor ersetzt die aktuelle Markierung). Nenne abschließend in maximal drei Stichpunkten, was du geändert hast. Antworte in der Sprache der Oberfläche.',
    },
    {
      title: 'Übersetzer',
      prompt: 'Übersetze den markierten Text in die gewünschte Sprache (wenn nicht angegeben: Sprache der Oberfläche). Bleibe Bedeutung und Formatierung treu. Ersetze die Markierung durch die Übersetzung (set_text) oder gib die Übersetzung als Antwort aus. Antworte ansonsten nur mit dem übersetzten Text.',
    },
    {
      title: 'E-Mail-Antwortentwurf',
      prompt: 'Verfasse aus dem Seiteninhalt (z. B. eine Anfrage oder ein Kontaktformular) einen professionellen Antwortentwurf. Fasse das Anliegen in einem Satz zusammen, antworte höflich und konkret, schließe mit einer freundlichen Formulierung. Fülle das Antwortfeld auf der Seite, falls vorhanden, mit fill_element. Gib den Entwurf zusätzlich als Antwort aus. Antworte in der Sprache der Oberfläche.',
    },
    {
      title: 'Produktanalyse & Preis-Check',
      prompt: 'Analysiere den Seiteninhalt (Produktseite): Produktname, Preis, Versandkosten, Lieferzeit, Bewertungen und verfügbare Optionen. Gib eine kompakte, strukturierte Zusammenfassung als Liste aus, mit klaren Vor- und Nachteilen. Lese bei Bedarf Details mit read_content nach. Antworte in der Sprache der Oberfläche.',
    },
    {
      title: 'AGB- & Datenschutz-Checker',
      prompt: 'Erkläre den markierten Abschnitt (oder den Seiteninhalt) in einfacher, verständlicher Sprache. Hebe kritische Punkte, Rechte, Pflichten und mögliche Fallstricke klar hervor. Lies bei Bedarf den Abschnitt mit read_content erneut ein. Strukturiere deine Antwort mit Überschriften und Bullet-Points. Antworte in der Sprache der Oberfläche.',
    },
    {
      title: 'Formular-Validator',
      prompt: 'Lies die Formularfelder der Seite mit read_content aus und prüfe sie auf Fehler, fehlende Pflichtfelder oder ungültige Formate (z. B. E-Mail, Telefon, PLZ). Erkläre jeden Befund kurz und konkret. Korrigiere eindeutige Fehler selbst mit fill_element. Antworte in der Sprache der Oberfläche.',
    },
    {
      title: 'Termin-/Event-Extraktion',
      prompt: 'Extrahiere aus dem Seiteninhalt alle Termine, Deadlines oder Events als strukturierte Liste mit Datum, Uhrzeit, Titel und Ort. Sortiere chronologisch, weise auf bevorstehende Termine besonders hin und lies bei Bedarf Details mit read_content nach. Antworte in der Sprache der Oberfläche.',
    },
    {
      title: 'SEO-/Copy-Rewriter',
      prompt: 'Schreibe den markierten Text überzeugender und klarer um (bessere Struktur, Call-to-Action, aktivere Formulierung), ohne Kernbotschaft und Tonalität zu verändern. Ersetze die Markierung durch die neue Fassung (set_text) oder liefere 2–3 Varianten zur Auswahl. Antworte in der Sprache der Oberfläche.',
    },
  ],
  en: [
    {
      title: 'Fill address in forms',
      prompt: 'Fill in the address fields of the form on the page with the address data from the context (marked selection or page content). Use fill_element with suitable CSS selectors for name, street, postal code, city and country. Then check with read_content whether all required fields are filled correctly and add missing details. Answer briefly in the UI language.',
    },
    {
      title: 'Proofread',
      prompt: 'Check the marked text for spelling, grammar, punctuation and style. Correct it and replace the selection with the corrected version (set_text without a selector replaces the current selection). Finally, name in at most three bullet points what you changed. Answer in the UI language.',
    },
    {
      title: 'Translator',
      prompt: 'Translate the marked text into the requested language (if not specified: the UI language). Stay faithful to meaning and formatting. Replace the selection with the translation (set_text) or output the translation as your answer. Otherwise reply only with the translated text.',
    },
    {
      title: 'Email reply draft',
      prompt: 'Write a professional reply draft based on the page content (e.g. an inquiry or a contact form). Summarize the request in one sentence, reply politely and concretely, and close with a friendly line. Fill the reply field on the page, if present, using fill_element. Also output the draft as your answer. Answer in the UI language.',
    },
    {
      title: 'Product analysis & price check',
      prompt: 'Analyze the page content (product page): product name, price, shipping costs, delivery time, reviews and available options. Provide a compact, structured summary as a list with clear pros and cons. Use read_content to look up details when needed. Answer in the UI language.',
    },
    {
      title: 'Terms & privacy checker',
      prompt: 'Explain the marked section (or the page content) in simple, understandable language. Clearly highlight critical points, rights, obligations and potential pitfalls. Re-read the relevant section with read_content when needed. Structure your answer with headings and bullet points. Answer in the UI language.',
    },
    {
      title: 'Form validator',
      prompt: 'Read out the form fields of the page with read_content and check them for errors, missing required fields or invalid formats (e.g. email, phone, postal code). Explain each finding briefly and concretely. Fix clear errors yourself with fill_element. Answer in the UI language.',
    },
    {
      title: 'Event extraction',
      prompt: 'Extract all appointments, deadlines or events from the page content as a structured list with date, time, title and location. Sort chronologically, point out upcoming events in particular and use read_content for details when needed. Answer in the UI language.',
    },
    {
      title: 'SEO/copy rewriter',
      prompt: 'Rewrite the marked text to be more persuasive and clearer (better structure, call to action, more active wording) without changing the core message and tone. Replace the selection with the new version (set_text) or provide 2–3 variants to choose from. Answer in the UI language.',
    },
  ],
  fr: [
    {
      title: 'Remplir l’adresse dans les formulaires',
      prompt: 'Remplissez les champs d’adresse du formulaire sur la page avec les données d’adresse du contexte (sélection marquée ou contenu de la page). Utilisez fill_element avec des sélecteurs CSS adaptés pour le nom, la rue, le code postal, la ville et le pays. Vérifiez ensuite avec read_content que tous les champs obligatoires sont correctement remplis et complétez les informations manquantes. Répondez brièvement dans la langue de l’interface.',
    },
    {
      title: 'Relecture',
      prompt: 'Vérifiez le texte sélectionné : orthographe, grammaire, ponctuation et style. Corrigez-le et remplacez la sélection par la version corrigée (set_text sans sélecteur remplace la sélection actuelle). Terminez en indiquant en trois points au maximum ce que vous avez modifié. Répondez dans la langue de l’interface.',
    },
    {
      title: 'Traducteur',
      prompt: 'Traduisez le texte sélectionné dans la langue demandée (si aucune n’est précisée : la langue de l’interface). Restez fidèle au sens et au format. Remplacez la sélection par la traduction (set_text) ou affichez la traduction comme réponse. Sinon, répondez uniquement avec le texte traduit.',
    },
    {
      title: 'Brouillon de réponse e-mail',
      prompt: 'Rédigez un projet de réponse professionnel à partir du contenu de la page (par ex. une demande ou un formulaire de contact). Résumez la demande en une phrase, répondez poliment et concrètement, et terminez par une formule aimable. Remplissez le champ de réponse de la page, s’il existe, avec fill_element. Affichez également le projet comme réponse. Répondez dans la langue de l’interface.',
    },
    {
      title: 'Analyse produit & vérification du prix',
      prompt: 'Analysez le contenu de la page (page produit) : nom du produit, prix, frais de livraison, délai, avis et options disponibles. Fournissez un résumé compact et structuré sous forme de liste, avec des avantages et inconvénients clairs. Utilisez read_content pour consulter les détails si nécessaire. Répondez dans la langue de l’interface.',
    },
    {
      title: 'Vérificateur CGV & confidentialité',
      prompt: 'Expliquez la section marquée (ou le contenu de la page) en langage simple et compréhensible. Mettez clairement en évidence les points critiques, les droits, les obligations et les pièges possibles. Relisez si nécessaire la section concernée avec read_content. Structurez votre réponse avec des titres et des puces. Répondez dans la langue de l’interface.',
    },
    {
      title: 'Validateur de formulaire',
      prompt: 'Lisez les champs du formulaire avec read_content et vérifiez-les : erreurs, champs obligatoires manquants ou formats invalides (par ex. e-mail, téléphone, code postal). Expliquez chaque constat brièvement et concrètement. Corrigez vous-même les erreurs évidentes avec fill_element. Répondez dans la langue de l’interface.',
    },
    {
      title: 'Extraction de rendez-vous',
      prompt: 'Extrayez du contenu de la page tous les rendez-vous, échéances ou événements sous forme de liste structurée avec date, heure, titre et lieu. Triez chronologiquement, signalez en particulier les événements à venir et utilisez read_content pour les détails si nécessaire. Répondez dans la langue de l’interface.',
    },
    {
      title: 'Réécriture SEO/copie',
      prompt: 'Réécrivez le texte sélectionné de manière plus convaincante et plus claire (meilleure structure, appel à l’action, formulation plus active) sans changer le message ni le ton. Remplacez la sélection par la nouvelle version (set_text) ou proposez 2 à 3 variantes au choix. Répondez dans la langue de l’interface.',
    },
  ],
  es: [
    {
      title: 'Rellenar dirección en formularios',
      prompt: 'Rellena los campos de dirección del formulario de la página con los datos de dirección del contexto (selección marcada o contenido de la página). Usa fill_element con selectores CSS adecuados para nombre, calle, código postal, ciudad y país. A continuación, comprueba con read_content si todos los campos obligatorios están rellenados correctamente y completa los datos que falten. Responde brevemente en el idioma de la interfaz.',
    },
    {
      title: 'Corrección de estilo',
      prompt: 'Revisa el texto seleccionado: ortografía, gramática, puntuación y estilo. Corrígelo y reemplaza la selección por la versión corregida (set_text sin selector reemplaza la selección actual). Termina indicando en un máximo de tres puntos qué has cambiado. Responde en el idioma de la interfaz.',
    },
    {
      title: 'Traductor',
      prompt: 'Traduce el texto seleccionado al idioma solicitado (si no se indica: el idioma de la interfaz). Mantén el significado y el formato. Reemplaza la selección por la traducción (set_text) o muestra la traducción como respuesta. De lo contrario, responde solo con el texto traducido.',
    },
    {
      title: 'Borrador de respuesta por correo',
      prompt: 'Redacta un borrador de respuesta profesional a partir del contenido de la página (p. ej. una consulta o un formulario de contacto). Resume la solicitud en una frase, responde con cortesía y concreción y termina con una fórmula amable. Rellena el campo de respuesta de la página, si existe, con fill_element. Muestra también el borrador como respuesta. Responde en el idioma de la interfaz.',
    },
    {
      title: 'Análisis de producto y precio',
      prompt: 'Analiza el contenido de la página (página de producto): nombre, precio, gastos de envío, plazo de entrega, valoraciones y opciones disponibles. Da un resumen compacto y estructurado en forma de lista, con ventajas e inconvenientes claros. Usa read_content para consultar detalles si es necesario. Responde en el idioma de la interfaz.',
    },
    {
      title: 'Verificador de condiciones y privacidad',
      prompt: 'Explica la sección marcada (o el contenido de la página) en lenguaje sencillo y comprensible. Destaca claramente los puntos críticos, derechos, obligaciones y posibles trampas. Vuelve a leer la sección pertinente con read_content si es necesario. Estructura tu respuesta con títulos y viñetas. Responde en el idioma de la interfaz.',
    },
    {
      title: 'Validador de formularios',
      prompt: 'Lee los campos del formulario con read_content y compruébalos: errores, campos obligatorios vacíos o formatos no válidos (p. ej. correo, teléfono, código postal). Explica cada hallazgo de forma breve y concreta. Corrige tú mismo los errores evidentes con fill_element. Responde en el idioma de la interfaz.',
    },
    {
      title: 'Extracción de eventos',
      prompt: 'Extrae del contenido de la página todas las citas, plazos o eventos como lista estructurada con fecha, hora, título y lugar. Ordena cronológicamente, señala especialmente los eventos próximos y usa read_content para los detalles si es necesario. Responde en el idioma de la interfaz.',
    },
    {
      title: 'Reescritor SEO',
      prompt: 'Reescribe el texto seleccionado de forma más convincente y clara (mejor estructura, llamada a la acción, redacción más activa) sin cambiar el mensaje ni el tono. Reemplaza la selección por la nueva versión (set_text) o ofrece 2 o 3 variantes a elegir. Responde en el idioma de la interfaz.',
    },
  ],
  zh: [
    {
      title: '在表单中填写地址',
      prompt: '使用上下文（标记选区或页面内容）中的地址数据填写页面上表单的地址字段。使用 fill_element 并配合合适的 CSS 选择器填写姓名、街道、邮编、城市和国家。然后用 read_content 检查所有必填字段是否填写正确，并补充缺失的信息。请用界面语言简要回答。',
    },
    {
      title: '校对',
      prompt: '检查所选文本的拼写、语法、标点和风格。修正后，用修正版替换选区（不带选择器的 set_text 会替换当前选区）。最后用最多三个要点说明你修改了什么。请用界面语言回答。',
    },
    {
      title: '翻译',
      prompt: '将所选文本翻译成要求的语言（若未指定：界面语言）。忠实于原意和格式。用翻译替换选区（set_text），或将译文作为回答输出。否则只回复译文。',
    },
    {
      title: '邮件回复草稿',
      prompt: '根据页面内容（例如咨询或联系表单）撰写一封专业的回复草稿。用一句话概括请求，礼貌而具体地回复，并以友好的话语结尾。如页面有回复字段，用 fill_element 填写。同时将草稿作为回答输出。请用界面语言回答。',
    },
    {
      title: '产品分析与比价',
      prompt: '分析页面内容（产品页）：产品名称、价格、运费、配送时间、评价和可用选项。以列表形式给出简洁、结构化的总结，明确列出优缺点。必要时用 read_content 查询细节。请用界面语言回答。',
    },
    {
      title: '条款与隐私检查',
      prompt: '用简单易懂的语言解释所选部分（或页面内容）。清晰突出关键点、权利、义务和潜在陷阱。必要时用 read_content 重新阅读相关部分。用标题和要点组织回答。请用界面语言回答。',
    },
    {
      title: '表单校验',
      prompt: '用 read_content 读取页面上的表单字段并检查：错误、缺失的必填字段或无效格式（例如邮箱、电话、邮编）。简要而具体地说明每项发现。用 fill_element 自行修正明显的错误。请用界面语言回答。',
    },
    {
      title: '日程提取',
      prompt: '从页面内容中提取所有约会、截止日期或事件，作为包含日期、时间、标题和地点的结构化列表。按时间排序，特别指出即将到来的事件，并在需要时用 read_content 查看详情。请用界面语言回答。',
    },
    {
      title: 'SEO 改写',
      prompt: '在不改变核心信息和语气的前提下，将所选文本改写得更具说服力和更清晰（更好的结构、行动号召、更主动的措辞）。用新版本替换选区（set_text），或提供 2–3 个备选方案。请用界面语言回答。',
    },
  ],
}

export function getDefaultPrompts(locale: Locale): PromptSeed[] {
  return DEFAULT_PROMPTS[locale] ?? DEFAULT_PROMPTS.de
}