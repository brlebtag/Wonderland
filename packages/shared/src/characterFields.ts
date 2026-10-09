// Catálogo da ficha de personagem. É a única fonte de verdade dos campos:
// o backend gera a validação a partir dele e o frontend gera o formulário e a ficha.
// Para adicionar/remover um campo, basta mexer aqui (os valores ficam em Character.attributes, JSON).
// Os `value` das opções são gravados no banco: não os renomeie depois de usados.

export type FieldType =
  | 'text' // uma linha
  | 'textarea' // texto longo
  | 'number'
  | 'date' // YYYY-MM-DD
  | 'boolean' // Sim / Não (vazio = não informado)
  | 'select' // uma opção
  | 'multiselect'; // várias opções

export type FieldOption = { value: string; label: string };

export type CharacterField = {
  key: string;
  label: string;
  type: FieldType;
  options?: FieldOption[];
  unit?: string;
};

export type FieldGroup = { key: string; label: string; fields: CharacterField[] };

export type AttributeValue = string | number | boolean | string[];
export type CharacterAttributes = Record<string, AttributeValue>;

const o = (value: string, label: string): FieldOption => ({ value, label });

const text = (key: string, label: string): CharacterField => ({ key, label, type: 'text' });
const long = (key: string, label: string): CharacterField => ({ key, label, type: 'textarea' });
const yesNo = (key: string, label: string): CharacterField => ({ key, label, type: 'boolean' });

export const BODY_TYPES = [
  o('petite', 'Baixo e magro (petite)'),
  o('athletic', 'Atlético (athletic)'),
  o('muscular', 'Musculoso (muscular)'),
  o('fit', 'Sarado/em forma (fit)'),
  o('toned', 'Definido/tonificado (toned)'),
  o('stocky', 'Atarracado/robusto (stocky)'),
  o('lanky', 'Alto, esguio, magro e desajeitado (lanky)'),
  o('statuesque', 'Estatuária/alta e elegante (statuesque)'),
  o('slim', 'Magro saudável e elegante (slim)'),
  o('slender', 'Esguio/gracioso (slender)'),
  o('lean', 'Magro e seco (lean)'),
  o('curvy', 'Curvilínea (curvy)'),
  o('voluptuous', 'Voluptuosa (voluptuous)'),
  o('plus-size', 'Gordo/plus-size (plus-size)'),
  o('broad-shouldered', 'De ombros largos (broad-shouldered)'),
];

export const HAIR_TEXTURES = [
  o('straight', 'Liso (straight)'),
  o('wavy', 'Ondulado (wavy)'),
  o('curly', 'Cacheado (curly)'),
  o('coily', 'Crespo (coily/kinky)'),
  o('fine', 'Fino (fine)'),
  o('thick', 'Grosso (thick)'),
  o('thinning', 'Ralo (thin/thinning)'),
  o('silky', 'Sedoso (silky)'),
  o('smooth', 'Alinhado (smooth)'),
  o('frizzy', 'Arrepiado/com frizz (frizzy)'),
  o('dry', 'Seco (dry)'),
  o('oily', 'Oleoso/com sebo natural (greasy/oily)'),
];

export const HAIR_STYLES = [
  o('ponytail', 'Rabo de cavalo (ponytail)'),
  o('high-bun', 'Coque alto (high bun)'),
  o('messy-bun', 'Coque despojado/bagunçadinho (messy bun)'),
  o('bun', 'Coque (bun)'),
  o('braids', 'Tranças (braids/plaits)'),
  o('pigtails', 'Maria-chiquinha (pigtails)'),
  o('half-up', 'Meio-preso/meio-solto (half-up/half-down)'),
  o('bob', 'Chanel (bob)'),
  o('pixie', 'Corte joãozinho (pixie cut)'),
  o('buzz-cut', 'Cabelo raspado (buzz cut)'),
  o('crew-cut', 'Corte militar (crew cut)'),
  o('layered', 'Repicado/em camadas (layered)'),
  o('blunt-cut', 'Corte reto (blunt cut)'),
  o('shag', 'Repicado bagunçado (shag/shaggy)'),
  o('bangs', 'Franja (bangs/fringe)'),
  o('blunt-bangs', 'Franja reta (blunt bangs)'),
  o('curtain-bangs', 'Franja de cortina (curtain bangs)'),
];

export const VOICE_TYPES = [
  o('deep', 'Grave/profunda (deep)'),
  o('high-pitched', 'Aguda/fina (high-pitched)'),
  o('low', 'Baixa/contida/suave (low)'),
  o('baritone', 'Barítono/baixo (baritone)'),
  o('raspy', 'Rouca/áspera (raspy/gravelly)'),
  o('husky', 'Rouca e atraente (husky)'),
  o('hoarse', 'Rouca por doença/perdeu a voz (hoarse)'),
  o('breathy', 'Sussurrada/ofegante (breathy)'),
  o('crisp', 'Clara/nítida (crisp/clear)'),
  o('monotone', 'Monotônica (monotone)'),
  o('soft-spoken', 'De voz mansa (soft-spoken)'),
  o('squeaky', 'Estridente/anasalada aguda (squeaky)'),
  o('melodic', 'Melódica (melodic/musical)'),
  o('booming', 'Retumbante (booming)'),
  o('commanding', 'Imponente/autoritária (commanding)'),
  o('gentle', 'Gentil e doce (gentle)'),
];

export const POSTURES = [
  o('upright', 'Ereta/reta (straight/upright)'),
  o('erect', 'Muito ereta/firme (erect)'),
  o('proud', 'Altiva/orgulhosa (proud)'),
  o('poised', 'Elegante/equilibrada (poised)'),
  o('slouched', 'Desleixada (slouched/slouching)'),
  o('hunched', 'Corcunda/encolhida (hunched)'),
  o('stooped', 'Curvada (stooped)'),
  o('stiff', 'Rígida (stiff/rigid)'),
  o('relaxed', 'Relaxada/descontraída (relaxed/casual)'),
  o('defensive', 'Defensiva (defensive)'),
  o('slumped', 'Desabada/caída (slumped)'),
];

export const characterFieldGroups: FieldGroup[] = [
  {
    key: 'basic',
    label: 'Dados básicos',
    fields: [
      { key: 'age', label: 'Idade', type: 'number', unit: 'anos' },
      {
        key: 'sex',
        label: 'Sexo',
        type: 'select',
        options: [o('female', 'Feminino'), o('male', 'Masculino'), o('intersex', 'Intersexo'), o('other', 'Outro')],
      },
      { key: 'birthDate', label: 'Data de nascimento', type: 'date' },
      { key: 'deathDate', label: 'Data de falecimento', type: 'date' },
      text('birthPlace', 'Lugar de nascimento'),
      text('birthSigns', 'Sinais de nascimento'),
      text('religion', 'Religião'),
      text('dialect', 'Dialeto'),
      text('accent', 'Sotaque'),
      long('education', 'Educação'),
    ],
  },
  {
    key: 'appearance',
    label: 'Aparência',
    fields: [
      { key: 'height', label: 'Altura', type: 'number', unit: 'cm' },
      { key: 'weight', label: 'Peso', type: 'number', unit: 'kg' },
      { key: 'bodyType', label: 'Constituição corporal', type: 'multiselect', options: BODY_TYPES },
      text('skinTone', 'Tom de pele'),
      text('hairColor', 'Cor do cabelo'),
      { key: 'hairTexture', label: 'Textura do cabelo', type: 'multiselect', options: HAIR_TEXTURES },
      { key: 'hairStyle', label: 'Estilo do cabelo', type: 'multiselect', options: HAIR_STYLES },
      text('eyeColor', 'Cor dos olhos'),
      { key: 'posture', label: 'Postura', type: 'multiselect', options: POSTURES },
      { key: 'voiceType', label: 'Tipo de voz', type: 'multiselect', options: VOICE_TYPES },
      text('bustSize', 'Tamanho dos peitos'),
      yesNo('wearsGlasses', 'Usa óculos?'),
      yesNo('wearsNecklace', 'Usa colar?'),
      yesNo('wearsRings', 'Usa anéis?'),
      long('birthmarks', 'Marcas de nascença'),
      long('tattoos', 'Tatuagens'),
      long('skinDamage', 'Danos na pele'),
      long('otherPhysicalTraits', 'Outras características físicas distintivas'),
    ],
  },
  {
    key: 'health',
    label: 'Saúde e corpo',
    fields: [
      {
        key: 'bloodType',
        label: 'Tipo sanguíneo',
        type: 'select',
        options: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((t) => o(t, t)),
      },
      {
        key: 'handedness',
        label: 'Destreza',
        type: 'select',
        options: [o('right', 'Destro'), o('ambidextrous', 'Bidestro'), o('left', 'Canhoto')],
      },
      yesNo('isBlind', 'É cego?'),
      yesNo('isColorblind', 'Tem daltonismo?'),
      text('drugUse', 'Usa drogas'),
      long('surgeries', 'Cirurgias'),
      long('illnesses', 'Cavidades/doenças'),
    ],
  },
  {
    key: 'personality',
    label: 'Personalidade',
    fields: [
      long('personalityTraits', 'Traços de personalidade'),
      text('cheerful', 'Alegre?'),
      text('gloomy', 'Sombrio?'),
      text('goodHumored', 'Bem-humorado?'),
      text('violent', 'Violento?'),
      text('active', 'Ativo?'),
      text('sociable', 'Sociável?'),
      text('intellectual', 'Intelectual?'),
      text('virtuous', 'Virtuoso?'),
      text('expressive', 'Expressivo?'),
      long('distinctive', 'O que há de distintivo neles (personalidade)?'),
      long('unusualTraits', 'Traços incomuns?'),
      long('weaknesses', 'Fraquezas?'),
      long('worries', 'Preocupações?'),
      long('strengthsWeaknesses', 'Pontos fortes e fracos'),
      long('thinkingAbout', 'Pensando sobre?'),
      long('dreams', 'Sonhos para o futuro'),
      long('fears', 'Medos'),
      long('habits', 'Hábitos'),
      long('favoriteProverbs', 'Provérbios favoritos'),
    ],
  },
  {
    key: 'goals',
    label: 'Objetivos e curiosidades',
    fields: [
      long('goals', 'Objetivos'),
      long('desires', 'Desejos'),
      long('trivia', 'Trivialidades'),
    ],
  },
  {
    key: 'past',
    label: 'Passado',
    fields: [
      long('childhoodExperiences', 'Experiências formativas quando criança (incluindo quem estava envolvido)'),
      long('schools', 'Escolas'),
      long('criminalRecord', 'Registros criminais'),
      long('sexualHistory', 'História sexual'),
    ],
  },
  {
    key: 'relationships',
    label: 'Relacionamentos',
    fields: [
      long('relationships', 'Relacionamentos (incluindo comportamento)'),
      long('familyRelations', 'Relações familiares (incluindo comportamento)'),
      long('problematicRelationships', 'Relacionamentos problemáticos'),
      long('marriedTo', 'Casado com quem'),
      long('romanceWith', 'Romance com quem'),
      long('lovers', 'Amantes'),
      long('likes', 'Gosta de quem'),
      long('dislikes', 'Não gosta de quem'),
      long('hates', 'Pessoas que o sujeito odeia'),
      long('pets', 'Animais/plantas de estimação'),
    ],
  },
  {
    key: 'work',
    label: 'Trabalho e finanças',
    fields: [
      long('jobs', 'Empregos'),
      long('economicSituation', 'Situação econômica'),
      long('economicBehavior', 'Comportamento econômico'),
    ],
  },
  {
    key: 'skills',
    label: 'Habilidades',
    fields: [
      long('specialSkills', 'Habilidades especiais'),
      long('fightingStyles', 'Estilos de luta'),
      yesNo('agile', 'Ágil?'),
      long('sports', 'Esportes'),
      long('dance', 'Dança'),
      long('martialArts', 'Artes marciais'),
      long('weapons', 'Armas'),
      long('driving', 'Condução'),
      long('languages', 'Estudo de idiomas'),
      long('certifications', 'Outras certificações'),
      long('hobbies', 'Passatempos'),
      long('creativeActivities', 'Atividades criativas'),
    ],
  },
  {
    key: 'favorites',
    label: 'Gostos e favoritos',
    fields: [
      text('favoriteColor', 'Cor favorita'),
      text('perfume', 'Perfume/colônia'),
      long('favoriteFoods', 'Comidas favoritas'),
      long('clothes', 'Roupas'),
      long('music', 'Músicas'),
      long('books', 'Livros'),
      long('movies', 'Filmes'),
      long('newspapers', 'Jornais'),
      long('magazines', 'Revistas'),
      long('favoriteStories', 'Histórias favoritas'),
      long('collectibles', 'Colecionáveis'),
      long('favoriteThings', 'Coisas favoritas'),
    ],
  },
  {
    key: 'supernatural',
    label: 'Sobrenatural',
    fields: [
      long('sixthSense', 'Sexto sentido para certas coisas'),
      long('spiritAttuned', 'Sintonizado com os espíritos'),
      long('supernaturalAbilities', 'Habilidades sobrenaturais'),
    ],
  },
];

export const characterFields: CharacterField[] = characterFieldGroups.flatMap((g) => g.fields);

/** Remove valores vazios ('' , [], null, undefined) para guardar só o que foi preenchido. */
export function cleanAttributes(attrs: Record<string, unknown>): CharacterAttributes {
  const out: CharacterAttributes = {};
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === null) continue;
    if (typeof value === 'string' && value.trim() === '') continue;
    if (Array.isArray(value) && value.length === 0) continue;
    out[key] = value as CharacterAttributes[string];
  }
  return out;
}
