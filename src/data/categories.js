import {
  Store,
  Package,
  Wrench,
  Building2,
  Smartphone,
  Shirt,
  Armchair,
  Car,
  Boxes,
  Gift,
  Gavel,
  Star,
  Briefcase,
  House,
  Gamepad2,
  BookOpen,
  Clapperboard,
  PawPrint,
} from 'lucide-react';

export const categories = [
  {
    id: 'store_liquidation',
    name: 'Liquidazione negozio',
    shortName: 'Liquidazioni',
    icon: Store,
    color: '#00C853',
    chipColor: 'bg-green-500',
    optionalLocation: false,
    subcategories: [
      {
  id: 'abbigliamento',
  name: 'Abbigliamento',

  attributes: [
    {
      id: 'type',
      label: 'Tipologia',
      type: 'single_select',
      required: false,
      filterable: true,
      searchable: true,

      options: [
        {
          id: 'abbigliamento_uomo',
          label: 'Abbigliamento uomo',
        },
        {
          id: 'abbigliamento_donna',
          label: 'Abbigliamento donna',
        },
        {
          id: 'abbigliamento_bambino',
          label: 'Abbigliamento bambino',
        },
        {
          id: 'calzature',
          label: 'Calzature',
        },
        {
          id: 'accessori',
          label: 'Accessori',
        },
      ],
    },
  ],
},
      {
  id: 'alimentari',
  name: 'Alimentari',

  attributes: [
    {
      id: 'type',
      label: 'Tipologia',
      type: 'single_select',
      required: false,
      filterable: true,
      searchable: true,

      options: [
        {
          id: 'prodotti_confezionati',
          label: 'Prodotti confezionati',
        },
        {
          id: 'bevande',
          label: 'Bevande',
        },
        {
          id: 'prodotti_freschi',
          label: 'Prodotti freschi',
        },
        {
          id: 'dolciumi',
          label: 'Dolciumi',
        },
        {
          id: 'prodotti_surgelati',
          label: 'Prodotti surgelati',
        },
      ],
    },
  ],
},
      {
  id: 'bar_ristorazione',
  name: 'Bar e ristorazione',

  attributes: [
    {
      id: 'type',
      label: 'Tipologia',
      type: 'single_select',
      required: false,
      filterable: true,
      searchable: true,

      options: [
        { id: 'bar', label: 'Bar' },
        { id: 'ristorante', label: 'Ristorante' },
        { id: 'pizzeria', label: 'Pizzeria' },
        { id: 'pasticceria', label: 'Pasticceria' },
        { id: 'gelateria', label: 'Gelateria' },
        { id: 'tavola_calda', label: 'Tavola calda' },
      ],
    },
  ],
},
      {
  id: 'casa_arredamento',
  name: 'Casa e arredamento',

  attributes: [
    {
      id: 'type',
      label: 'Tipologia',
      type: 'single_select',
      required: false,
      filterable: true,
      searchable: true,

      options: [
        { id: 'mobili', label: 'Mobili' },
        { id: 'illuminazione', label: 'Illuminazione' },
        { id: 'casalinghi', label: 'Casalinghi' },
        { id: 'tessili', label: 'Tessili' },
        { id: 'decorazioni', label: 'Decorazioni' },
      ],
    },
  ],
},
      {
  id: 'cura_persona',
  name: 'Cura della persona',

  attributes: [
    {
      id: 'type',
      label: 'Tipologia',
      type: 'single_select',
      required: false,
      filterable: true,
      searchable: true,

      options: [
        { id: 'profumeria', label: 'Profumeria' },
        { id: 'cosmetica', label: 'Cosmetica' },
        { id: 'prodotti_per_capelli', label: 'Prodotti per capelli' },
        { id: 'igiene_personale', label: 'Igiene personale' },
      ],
    },
  ],
},
      {
  id: 'gioielleria_ottica',
  name: 'Gioielleria e ottica',

  attributes: [
    {
      id: 'type',
      label: 'Tipologia',
      type: 'single_select',
      required: false,
      filterable: true,
      searchable: true,

      options: [
        { id: 'gioielli', label: 'Gioielli' },
        { id: 'orologi', label: 'Orologi' },
        { id: 'occhiali', label: 'Occhiali' },
        { id: 'accessori', label: 'Accessori' },
      ],
    },
  ],
},
      {
  id: 'cartoleria',
  name: 'Cartoleria e ufficio',

  attributes: [
    {
      id: 'type',
      label: 'Tipologia',
      type: 'single_select',
      required: false,
      filterable: true,
      searchable: true,

      options: [
        { id: 'cancelleria', label: 'Cancelleria' },
        { id: 'libri', label: 'Libri' },
        { id: 'materiale_scolastico', label: 'Materiale scolastico' },
        { id: 'materiale_da_ufficio', label: 'Materiale da ufficio' },
      ],
    },
  ],
},
      {
  id: 'ferramenta',
  name: 'Ferramenta e fai da te',

  attributes: [
    {
      id: 'type',
      label: 'Tipologia',
      type: 'single_select',
      required: false,
      filterable: true,
      searchable: true,

      options: [
        { id: 'utensili', label: 'Utensili' },
        { id: 'materiale_elettrico', label: 'Materiale elettrico' },
        { id: 'materiale_idraulico', label: 'Materiale idraulico' },
        { id: 'vernici', label: 'Vernici' },
        { id: 'giardinaggio', label: 'Giardinaggio' },
      ],
    },
  ],
},
      {
  id: 'altro',
  name: 'Altro',
  attributes: [],
},
    ],
  },

  {
    id: 'product_stock',
    name: 'Stock di prodotti',
    shortName: 'Stock',
    icon: Package,
    color: '#F59E0B',
    chipColor: 'bg-amber-500',
    optionalLocation: false,
    subcategories: [
      {
  id: 'elettronica',
  name: 'Elettronica',

  attributes: [
    {
      id: 'brand',
      label: 'Marca',
      type: 'single_select',
      required: false,
      filterable: true,
      searchable: true,

      options: [
        { id: 'apple', label: 'Apple' },
        { id: 'samsung', label: 'Samsung' },
        { id: 'xiaomi', label: 'Xiaomi' },
        { id: 'sony', label: 'Sony' },
        { id: 'lg', label: 'LG' },
        { id: 'lenovo', label: 'Lenovo' },
        { id: 'asus', label: 'Asus' },
        { id: 'acer', label: 'Acer' },
        { id: 'hp', label: 'HP' },
        { id: 'dell', label: 'Dell' },
        { id: 'altro', label: 'Altro' },
      ],
    },
  ],
},
      {
  id: 'abbigliamento',
  name: 'Abbigliamento',

  attributes: [
    {
      id: 'brand',
      label: 'Marca',
      type: 'single_select',
      required: false,
      filterable: true,
      searchable: true,

      options: [
        { id: 'nike', label: 'Nike' },
        { id: 'adidas', label: 'Adidas' },
        { id: 'puma', label: 'Puma' },
        { id: 'levis', label: 'Levi’s' },
        { id: 'zara', label: 'Zara' },
        { id: 'hm', label: 'H&M' },
        { id: 'gucci', label: 'Gucci' },
        { id: 'prada', label: 'Prada' },
        { id: 'altro', label: 'Altro' },
      ],
    },
  ],
},
      {
  id: 'alimentari',
  name: 'Alimentari e bevande',

  attributes: [
    {
      id: 'type',
      label: 'Tipologia',
      type: 'single_select',
      required: false,
      filterable: true,
      searchable: true,

      options: [
        { id: 'alimenti_confezionati', label: 'Alimenti confezionati' },
        { id: 'bevande', label: 'Bevande' },
        { id: 'dolciumi', label: 'Dolciumi' },
        { id: 'prodotti_freschi', label: 'Prodotti freschi' },
        { id: 'prodotti_surgelati', label: 'Prodotti surgelati' },
      ],
    },
  ],
},
      {
  id: 'cosmetica',
  name: 'Cosmetica e cura della persona',

  attributes: [
    {
      id: 'brand',
      label: 'Marca',
      type: 'single_select',
      required: false,
      filterable: true,
      searchable: true,

      options: [
        { id: 'loreal', label: 'L’Oréal' },
        { id: 'nivea', label: 'Nivea' },
        { id: 'garnier', label: 'Garnier' },
        { id: 'dove', label: 'Dove' },
        { id: 'collistar', label: 'Collistar' },
        { id: 'kiko', label: 'Kiko' },
        { id: 'altro', label: 'Altro' },
      ],
    },
  ],
},
      {
  id: 'casa',
  name: 'Casa e casalinghi',

  attributes: [
    {
      id: 'type',
      label: 'Tipologia',
      type: 'single_select',
      required: false,
      filterable: true,
      searchable: true,

      options: [
        { id: 'casalinghi', label: 'Casalinghi' },
        { id: 'arredamento', label: 'Arredamento' },
        { id: 'tessili', label: 'Tessili' },
        { id: 'illuminazione', label: 'Illuminazione' },
        { id: 'decorazioni', label: 'Decorazioni' },
      ],
    },
  ],
},
      {
  id: 'giocattoli',
  name: 'Giocattoli',

  attributes: [
    {
      id: 'brand',
      label: 'Marca',
      type: 'single_select',
      required: false,
      filterable: true,
      searchable: true,

      options: [
        { id: 'lego', label: 'Lego' },
        { id: 'mattel', label: 'Mattel' },
        { id: 'hasbro', label: 'Hasbro' },
        { id: 'playmobil', label: 'Playmobil' },
        { id: 'clementoni', label: 'Clementoni' },
        { id: 'chicco', label: 'Chicco' },
        { id: 'altro', label: 'Altro' },
      ],
    },
  ],
},
      {
  id: 'cancelleria',
  name: 'Cancelleria e ufficio',

  attributes: [
    {
      id: 'type',
      label: 'Tipologia',
      type: 'single_select',
      required: false,
      filterable: true,
      searchable: true,

      options: [
        { id: 'materiale_scolastico', label: 'Materiale scolastico' },
        { id: 'materiale_da_ufficio', label: 'Materiale da ufficio' },
        { id: 'carta', label: 'Carta' },
        { id: 'scrittura', label: 'Scrittura' },
        { id: 'archiviazione', label: 'Archiviazione' },
      ],
    },
  ],
},
    ],
  },

  {
    id: 'equipment',
    name: 'Attrezzature e macchinari',
    shortName: 'Attrezzatura',
    icon: Wrench,
    color: '#3B82F6',
    chipColor: 'bg-blue-500',
    optionalLocation: false,
    subcategories: [
      {
  id: 'bar',
  name: 'Attrezzature per bar',

  attributes: [
    {
      id: 'type',
      label: 'Tipologia',
      type: 'single_select',
      required: false,
      filterable: true,
      searchable: true,

      options: [
        { id: 'macchina_da_caffe', label: 'Macchina da caffè' },
        { id: 'macinacaffe', label: 'Macinacaffè' },
        { id: 'banco_bar', label: 'Banco bar' },
        { id: 'frigorifero', label: 'Frigorifero' },
        { id: 'fabbricatore_di_ghiaccio', label: 'Fabbricatore di ghiaccio' },
        { id: 'lavastoviglie', label: 'Lavastoviglie' },
      ],
    },
  ],
},
      {
  id: 'ristorazione',
  name: 'Attrezzature per ristorazione',

  attributes: [
    {
      id: 'type',
      label: 'Tipologia',
      type: 'single_select',
      required: false,
      filterable: true,
      searchable: true,

      options: [
        { id: 'forno', label: 'Forno' },
        { id: 'cucina_professionale', label: 'Cucina professionale' },
        { id: 'friggitrice', label: 'Friggitrice' },
        { id: 'cappa', label: 'Cappa' },
        { id: 'lavastoviglie', label: 'Lavastoviglie' },
        { id: 'banco_refrigerato', label: 'Banco refrigerato' },
      ],
    },
  ],
},
      {
  id: 'officina',
  name: 'Officina',

  attributes: [
    {
      id: 'type',
      label: 'Tipologia',
      type: 'single_select',
      required: false,
      filterable: true,
      searchable: true,

      options: [
        { id: 'ponte_sollevatore', label: 'Ponte sollevatore' },
        { id: 'compressore', label: 'Compressore' },
        { id: 'diagnostica', label: 'Diagnostica' },
        { id: 'utensili', label: 'Utensili' },
        { id: 'smontagomme', label: 'Smontagomme' },
      ],
    },
  ],
},
      {
  id: 'edilizia',
  name: 'Edilizia',

  attributes: [
    {
      id: 'type',
      label: 'Tipologia',
      type: 'single_select',
      required: false,
      filterable: true,
      searchable: true,

      options: [
        { id: 'betoniera', label: 'Betoniera' },
        { id: 'ponteggio', label: 'Ponteggio' },
        { id: 'generatore', label: 'Generatore' },
        { id: 'escavatore', label: 'Escavatore' },
        { id: 'utensili_professionali', label: 'Utensili professionali' },
      ],
    },
  ],
},
      {
  id: 'agricoltura',
  name: 'Agricoltura',

  attributes: [
    {
      id: 'type',
      label: 'Tipologia',
      type: 'single_select',
      required: false,
      filterable: true,
      searchable: true,

      options: [
        { id: 'trattore', label: 'Trattore' },
        { id: 'motocoltivatore', label: 'Motocoltivatore' },
        { id: 'attrezzi_agricoli', label: 'Attrezzi agricoli' },
        { id: 'irrigazione', label: 'Irrigazione' },
        { id: 'macchinari_per_raccolta', label: 'Macchinari per raccolta' },
      ],
    },
  ],
},
      {
  id: 'industria',
  name: 'Industria e produzione',

  attributes: [
    {
      id: 'type',
      label: 'Tipologia',
      type: 'single_select',
      required: false,
      filterable: true,
      searchable: true,

      options: [
        { id: 'macchinario_industriale', label: 'Macchinario industriale' },
        { id: 'linea_di_produzione', label: 'Linea di produzione' },
        { id: 'imballaggio', label: 'Imballaggio' },
        { id: 'movimentazione', label: 'Movimentazione' },
        { id: 'utensile_professionale', label: 'Utensile professionale' },
      ],
    },
  ],
},
      {
  id: 'ufficio',
  name: 'Ufficio e negozio',

  attributes: [
    {
      id: 'type',
      label: 'Tipologia',
      type: 'single_select',
      required: false,
      filterable: true,
      searchable: true,

      options: [
        { id: 'registratore_di_cassa', label: 'Registratore di cassa' },
        { id: 'scaffalatura', label: 'Scaffalatura' },
        { id: 'stampante', label: 'Stampante' },
        { id: 'arredo_da_ufficio', label: 'Arredo da ufficio' },
        { id: 'sistema_informatico', label: 'Sistema informatico' },
      ],
    },
  ],
},
      {
  id: 'altro',
  name: 'Altro',
  attributes: [],
},
    ],
  },

  {
    id: 'business_sale',
    name: 'Attività in vendita',
    shortName: 'Attività',
    icon: Building2,
    color: '#8B5CF6',
    chipColor: 'bg-purple-500',
    optionalLocation: false,
    subcategories: [
      { id: 'bar', name: 'Bar', attributes: [] },
      { id: 'ristorante', name: 'Ristorante', attributes: [] },
      { id: 'pizzeria', name: 'Pizzeria', attributes: [] },
      { id: 'hotel', name: 'Albergo e struttura ricettiva', attributes: [] },
      { id: 'tabacchi', name: 'Tabaccheria', attributes: [] },
      { id: 'edicola', name: 'Edicola', attributes: [] },
      { id: 'negozio', name: 'Negozio', attributes: [] },
      { id: 'azienda', name: 'Azienda', attributes: [] },
      { id: 'artigianato', name: 'Attività artigianale', attributes: [] },
      { id: 'servizi', name: 'Servizi', attributes: [] },
      { id: 'altro', name: 'Altro', attributes: [] },
    ],
  },

  {
    id: 'electronics',
    name: 'Elettronica',
    shortName: 'Elettronica',
    icon: Smartphone,
    color: '#06B6D4',
    chipColor: 'bg-cyan-500',
    optionalLocation: true,
    subcategories: [
      {
  id: 'smartphone',
  name: 'Telefoni cellulari',

  attributes: [
    {
      id: 'brand',
      label: 'Marca',
      type: 'single_select',
      required: false,
      filterable: true,
      searchable: true,
      options: [
        { id: 'apple', label: 'Apple' },
        { id: 'samsung', label: 'Samsung' },
        { id: 'google', label: 'Google' },
        { id: 'xiaomi', label: 'Xiaomi' },
        { id: 'honor', label: 'Honor' },
        { id: 'huawei', label: 'Huawei' },
        { id: 'motorola', label: 'Motorola' },
        { id: 'oppo', label: 'Oppo' },
        { id: 'oneplus', label: 'OnePlus' },
        { id: 'nokia', label: 'Nokia' },
        { id: 'other', label: 'Altro' },
      ],
    },
  ],
},
      {
  id: 'tablet',
  name: 'Tavolette elettroniche',

  attributes: [
    {
      id: 'brand',
      label: 'Marca',
      type: 'single_select',
      required: false,
      filterable: true,
      searchable: true,

      options: [
        { id: 'apple', label: 'Apple' },
        { id: 'samsung', label: 'Samsung' },
        { id: 'lenovo', label: 'Lenovo' },
        { id: 'huawei', label: 'Huawei' },
        { id: 'microsoft', label: 'Microsoft' },
        { id: 'xiaomi', label: 'Xiaomi' },
        { id: 'altro', label: 'Altro' },
      ],
    },
  ],
},
      {
  id: 'computer',
  name: 'Computer portatili e fissi',

  attributes: [
    {
      id: 'brand',
      label: 'Marca',
      type: 'single_select',
      required: false,
      filterable: true,
      searchable: true,

      options: [
        { id: 'apple', label: 'Apple' },
        { id: 'dell', label: 'Dell' },
        { id: 'hp', label: 'HP' },
        { id: 'lenovo', label: 'Lenovo' },
        { id: 'asus', label: 'Asus' },
        { id: 'acer', label: 'Acer' },
        { id: 'microsoft', label: 'Microsoft' },
        { id: 'msi', label: 'MSI' },
        { id: 'altro', label: 'Altro' },
      ],
    },
  ],
},
      {
  id: 'televisori',
  name: 'Televisori',

  attributes: [
    {
      id: 'brand',
      label: 'Marca',
      type: 'single_select',
      required: false,
      filterable: true,
      searchable: true,

      options: [
        { id: 'samsung', label: 'Samsung' },
        { id: 'lg', label: 'LG' },
        { id: 'sony', label: 'Sony' },
        { id: 'philips', label: 'Philips' },
        { id: 'tcl', label: 'TCL' },
        { id: 'hisense', label: 'Hisense' },
        { id: 'panasonic', label: 'Panasonic' },
        { id: 'altro', label: 'Altro' },
      ],
    },
  ],
},
      {
  id: 'console',
  name: 'Console e videogiochi',

  attributes: [
    {
      id: 'brand',
      label: 'Marca',
      type: 'single_select',
      required: false,
      filterable: true,
      searchable: true,

      options: [
        { id: 'sony', label: 'Sony' },
        { id: 'microsoft', label: 'Microsoft' },
        { id: 'nintendo', label: 'Nintendo' },
        { id: 'altro', label: 'Altro' },
      ],
    },
  ],
},
      {
  id: 'orologi',
  name: 'Orologi intelligenti',

  attributes: [
    {
      id: 'brand',
      label: 'Marca',
      type: 'single_select',
      required: false,
      filterable: true,
      searchable: true,

      options: [
        { id: 'apple', label: 'Apple' },
        { id: 'samsung', label: 'Samsung' },
        { id: 'garmin', label: 'Garmin' },
        { id: 'huawei', label: 'Huawei' },
        { id: 'xiaomi', label: 'Xiaomi' },
        { id: 'amazfit', label: 'Amazfit' },
        { id: 'altro', label: 'Altro' },
      ],
    },
  ],
},
      {
  id: 'fotografia',
  name: 'Fotografia e videocamere',

  attributes: [
    {
      id: 'brand',
      label: 'Marca',
      type: 'single_select',
      required: false,
      filterable: true,
      searchable: true,

      options: [
        { id: 'canon', label: 'Canon' },
        { id: 'nikon', label: 'Nikon' },
        { id: 'sony', label: 'Sony' },
        { id: 'fujifilm', label: 'Fujifilm' },
        { id: 'panasonic', label: 'Panasonic' },
        { id: 'gopro', label: 'GoPro' },
        { id: 'dji', label: 'DJI' },
        { id: 'altro', label: 'Altro' },
      ],
    },
  ],
},
      {
  id: 'audio',
  name: 'Audio e cuffie',

  attributes: [
    {
      id: 'brand',
      label: 'Marca',
      type: 'single_select',
      required: false,
      filterable: true,
      searchable: true,

      options: [
        { id: 'apple', label: 'Apple' },
        { id: 'sony', label: 'Sony' },
        { id: 'bose', label: 'Bose' },
        { id: 'jbl', label: 'JBL' },
        { id: 'samsung', label: 'Samsung' },
        { id: 'sennheiser', label: 'Sennheiser' },
        { id: 'marshall', label: 'Marshall' },
        { id: 'altro', label: 'Altro' },
      ],
    },
  ],
},
      {
  id: 'componenti',
  name: 'Componenti per computer',

  attributes: [
    {
      id: 'brand',
      label: 'Marca',
      type: 'single_select',
      required: false,
      filterable: true,
      searchable: true,

      options: [
        { id: 'nvidia', label: 'NVIDIA' },
        { id: 'amd', label: 'AMD' },
        { id: 'intel', label: 'Intel' },
        { id: 'asus', label: 'Asus' },
        { id: 'msi', label: 'MSI' },
        { id: 'gigabyte', label: 'Gigabyte' },
        { id: 'corsair', label: 'Corsair' },
        { id: 'altro', label: 'Altro' },
      ],
    },
  ],
},
      {
  id: 'elettrodomestici',
  name: 'Elettrodomestici',

  attributes: [
    {
      id: 'brand',
      label: 'Marca',
      type: 'single_select',
      required: false,
      filterable: true,
      searchable: true,

      options: [
        { id: 'samsung', label: 'Samsung' },
        { id: 'lg', label: 'LG' },
        { id: 'bosch', label: 'Bosch' },
        { id: 'whirlpool', label: 'Whirlpool' },
        { id: 'electrolux', label: 'Electrolux' },
        { id: 'beko', label: 'Beko' },
        { id: 'miele', label: 'Miele' },
        { id: 'dyson', label: 'Dyson' },
        { id: 'altro', label: 'Altro' },
      ],
    },
  ],
},
      {
  id: 'accessori',
  name: 'Accessori elettronici',

  attributes: [
    {
      id: 'brand',
      label: 'Marca',
      type: 'single_select',
      required: false,
      filterable: true,
      searchable: true,

      options: [
        { id: 'apple', label: 'Apple' },
        { id: 'samsung', label: 'Samsung' },
        { id: 'anker', label: 'Anker' },
        { id: 'logitech', label: 'Logitech' },
        { id: 'trust', label: 'Trust' },
        { id: 'altro', label: 'Altro' },
      ],
    },
  ],
},
      {
  id: 'altro',
  name: 'Altro',
  attributes: [],
},
    ],
  },

  {
    id: 'clothing',
    name: 'Abbigliamento',
    shortName: 'Abbigliamento',
    icon: Shirt,
    color: '#EC4899',
    chipColor: 'bg-pink-500',
    optionalLocation: true,
    subcategories: [
      {
  id: 'uomo',
  name: 'Uomo',

  attributes: [
    {
      id: 'brand',
      label: 'Marca',
      type: 'single_select',
      required: false,
      filterable: true,
      searchable: true,

      options: [
        { id: 'nike', label: 'Nike' },
        { id: 'adidas', label: 'Adidas' },
        { id: 'puma', label: 'Puma' },
        { id: 'levis', label: "Levi's" },
        { id: 'zara', label: 'Zara' },
        { id: 'hm', label: 'H&M' },
        { id: 'gucci', label: 'Gucci' },
        { id: 'prada', label: 'Prada' },
        { id: 'altro', label: 'Altro' },
      ],
    },
  ],
},
      {
  id: 'donna',
  name: 'Donna',

  attributes: [
    {
      id: 'brand',
      label: 'Marca',
      type: 'single_select',
      required: false,
      filterable: true,
      searchable: true,

      options: [
        { id: 'nike', label: 'Nike' },
        { id: 'adidas', label: 'Adidas' },
        { id: 'zara', label: 'Zara' },
        { id: 'hm', label: 'H&M' },
        { id: 'gucci', label: 'Gucci' },
        { id: 'prada', label: 'Prada' },
        { id: 'versace', label: 'Versace' },
        { id: 'altro', label: 'Altro' },
      ],
    },
  ],
},
      {
  id: 'bambino',
  name: 'Bambino',

  attributes: [
    {
      id: 'brand',
      label: 'Marca',
      type: 'single_select',
      required: false,
      filterable: true,
      searchable: true,

      options: [
        { id: 'chicco', label: 'Chicco' },
        { id: 'benetton', label: 'Benetton' },
        { id: 'zara', label: 'Zara' },
        { id: 'hm', label: 'H&M' },
        { id: 'nike', label: 'Nike' },
        { id: 'adidas', label: 'Adidas' },
        { id: 'altro', label: 'Altro' },
      ],
    },
  ],
},
      {
  id: 'scarpe',
  name: 'Scarpe',

  attributes: [
    {
      id: 'brand',
      label: 'Marca',
      type: 'single_select',
      required: false,
      filterable: true,
      searchable: true,

      options: [
        { id: 'nike', label: 'Nike' },
        { id: 'adidas', label: 'Adidas' },
        { id: 'puma', label: 'Puma' },
        { id: 'new_balance', label: 'New Balance' },
        { id: 'converse', label: 'Converse' },
        { id: 'vans', label: 'Vans' },
        { id: 'geox', label: 'Geox' },
        { id: 'altro', label: 'Altro' },
      ],
    },
  ],
},
      {
  id: 'borse',
  name: 'Borse e valigie',

  attributes: [
    {
      id: 'brand',
      label: 'Marca',
      type: 'single_select',
      required: false,
      filterable: true,
      searchable: true,

      options: [
        { id: 'gucci', label: 'Gucci' },
        { id: 'prada', label: 'Prada' },
        { id: 'louis_vuitton', label: 'Louis Vuitton' },
        { id: 'samsonite', label: 'Samsonite' },
        { id: 'eastpak', label: 'Eastpak' },
        { id: 'altro', label: 'Altro' },
      ],
    },
  ],
},
      {
  id: 'accessori',
  name: 'Accessori',

  attributes: [
    {
      id: 'brand',
      label: 'Marca',
      type: 'single_select',
      required: false,
      filterable: true,
      searchable: true,

      options: [
        { id: 'ray_ban', label: 'Ray-Ban' },
        { id: 'gucci', label: 'Gucci' },
        { id: 'prada', label: 'Prada' },
        { id: 'nike', label: 'Nike' },
        { id: 'adidas', label: 'Adidas' },
        { id: 'altro', label: 'Altro' },
      ],
    },
  ],
},
      {
  id: 'altro',
  name: 'Altro',
  attributes: [],
},
    ],
  },

      {
      id: 'games_sports_hobbies',
      name: 'Giochi, sport e hobby',
      shortName: 'Giochi e sport',
      icon: Gamepad2,
      color: '#8B5CF6',
      chipColor: 'bg-violet-500',
      optionalLocation: true,
      subcategories: [
        {
          id: 'board_games_cards',
          name: 'Giochi da tavolo e carte',
          attributes: [
            {
              id: 'type',
              label: 'Tipologia',
              type: 'single_select',
              required: false,
              filterable: true,
              searchable: true,
              options: [
                {
                  id: 'card_game',
                  label: 'Gioco di carte',
                },
                {
                  id: 'board_game',
                  label: 'Gioco da tavolo',
                },
                {
                  id: 'collectible_cards',
                  label: 'Carte collezionabili',
                },
                {
                  id: 'role_playing_game',
                  label: 'Gioco di ruolo',
                },
                {
                  id: 'puzzle',
                  label: 'Puzzle',
                },
                {
                  id: 'other',
                  label: 'Altro',
                },
              ],
            },
          ],
        },
        {
          id: 'toys',
          name: 'Giocattoli',
          attributes: [
            {
              id: 'type',
              label: 'Tipologia',
              type: 'single_select',
              required: false,
              filterable: true,
              searchable: true,
              options: [
                {
                  id: 'building_sets',
                  label: 'Costruzioni',
                },
                {
                  id: 'dolls',
                  label: 'Bambole',
                },
                {
                  id: 'toy_vehicles',
                  label: 'Veicoli giocattolo',
                },
                {
                  id: 'educational_games',
                  label: 'Giochi educativi',
                },
                {
                  id: 'plush_toys',
                  label: 'Peluche',
                },
                {
                  id: 'playsets',
                  label: 'Playset',
                },
                {
                  id: 'other',
                  label: 'Altro',
                },
              ],
            },
          ],
        },
        {
          id: 'remote_control_modeling',
          name: 'Modellismo e radiocomandati',
          attributes: [
            {
              id: 'type',
              label: 'Tipologia',
              type: 'single_select',
              required: false,
              filterable: true,
              searchable: true,
              options: [
                {
                  id: 'remote_control_car',
                  label: 'Auto radiocomandata',
                },
                {
                  id: 'remote_control_motorcycle',
                  label: 'Moto radiocomandata',
                },
                {
                  id: 'remote_control_boat',
                  label: 'Barca radiocomandata',
                },
                {
                  id: 'remote_control_aircraft',
                  label: 'Aereo o elicottero radiocomandato',
                },
                {
                  id: 'drone',
                  label: 'Drone',
                },
                {
                  id: 'model_kit',
                  label: 'Modellino da costruire',
                },
                {
                  id: 'other',
                  label: 'Altro',
                },
              ],
            },
          ],
        },
        {
          id: 'sports_equipment',
          name: 'Sport e attrezzatura sportiva',
          attributes: [
            {
              id: 'sport',
              label: 'Sport',
              type: 'single_select',
              required: false,
              filterable: true,
              searchable: true,
              options: [
                {
                  id: 'football',
                  label: 'Calcio',
                },
                {
                  id: 'basketball',
                  label: 'Basket',
                },
                {
                  id: 'tennis',
                  label: 'Tennis',
                },
                {
                  id: 'padel',
                  label: 'Padel',
                },
                {
                  id: 'volleyball',
                  label: 'Pallavolo',
                },
                {
                  id: 'cycling',
                  label: 'Ciclismo',
                },
                {
                  id: 'swimming',
                  label: 'Nuoto',
                },
                {
                  id: 'combat_sports',
                  label: 'Sport da combattimento',
                },
                {
                  id: 'winter_sports',
                  label: 'Sport invernali',
                },
                {
                  id: 'other',
                  label: 'Altro sport',
                },
              ],
            },
          ],
        },
        {
          id: 'fitness',
          name: 'Fitness e palestra',
          attributes: [
            {
              id: 'type',
              label: 'Tipologia',
              type: 'single_select',
              required: false,
              filterable: true,
              searchable: true,
              options: [
                {
                  id: 'weights',
                  label: 'Pesi e manubri',
                },
                {
                  id: 'benches_racks',
                  label: 'Panche e strutture',
                },
                {
                  id: 'cardio_machines',
                  label: 'Attrezzi cardio',
                },
                {
                  id: 'fitness_accessories',
                  label: 'Accessori fitness',
                },
                {
                  id: 'yoga_pilates',
                  label: 'Yoga e pilates',
                },
                {
                  id: 'other',
                  label: 'Altro',
                },
              ],
            },
          ],
        },
        {
          id: 'outdoor_leisure',
          name: 'Attività all’aperto',
          attributes: [
            {
              id: 'type',
              label: 'Tipologia',
              type: 'single_select',
              required: false,
              filterable: true,
              searchable: true,
              options: [
                {
                  id: 'camping',
                  label: 'Campeggio',
                },
                {
                  id: 'hiking',
                  label: 'Escursionismo',
                },
                {
                  id: 'beach',
                  label: 'Mare e spiaggia',
                },
                {
                  id: 'outdoor_games',
                  label: 'Giochi da esterno',
                },
                {
                  id: 'skates_scooters',
                  label: 'Pattini e monopattini',
                },
                {
                  id: 'other',
                  label: 'Altro',
                },
              ],
            },
          ],
        },
        {
          id: 'collectibles',
          name: 'Collezionismo',
          attributes: [
            {
              id: 'type',
              label: 'Tipologia',
              type: 'single_select',
              required: false,
              filterable: true,
              searchable: true,
              options: [
                {
                  id: 'collectible_cards',
                  label: 'Carte collezionabili',
                },
                {
                  id: 'action_figures',
                  label: 'Action figure',
                },
                {
                  id: 'sports_memorabilia',
                  label: 'Memorabilia sportiva',
                },
                {
                  id: 'coins_stamps',
                  label: 'Monete e francobolli',
                },
                {
                  id: 'models',
                  label: 'Modellini',
                },
                {
                  id: 'other',
                  label: 'Altro',
                },
              ],
            },
          ],
        },
        {
          id: 'other',
          name: 'Altro',
          attributes: [],
        },
      ],
    },

  {
    id: 'home',
    name: 'Casa e arredamento',
    shortName: 'Casa e arredamento',
    icon: Armchair,
    color: '#14B8A6',
    chipColor: 'bg-teal-500',
    optionalLocation: true,
    subcategories: [
  {
    id: 'divani',
    name: 'Divani e poltrone',
    attributes: [
      {
        id: 'brand',
        label: 'Marca',
        type: 'single_select',
        required: false,
        filterable: true,
        searchable: true,
        options: [
          { id: 'ikea', label: 'Ikea' },
          { id: 'poltronesofa', label: 'Poltronesofà' },
          { id: 'natuzzi', label: 'Natuzzi' },
          { id: 'chateau_dax', label: "Chateau d'Ax" },
          { id: 'altro', label: 'Altro' },
        ],
      },
    ],
  },

  {
    id: 'tavoli',
    name: 'Tavoli e sedie',
    attributes: [
      {
        id: 'brand',
        label: 'Marca',
        type: 'single_select',
        required: false,
        filterable: true,
        searchable: true,
        options: [
          { id: 'ikea', label: 'Ikea' },
          { id: 'calligaris', label: 'Calligaris' },
          { id: 'kartell', label: 'Kartell' },
          { id: 'altro', label: 'Altro' },
        ],
      },
    ],
  },

  {
    id: 'camera',
    name: 'Camera da letto',
    attributes: [
      {
        id: 'brand',
        label: 'Marca',
        type: 'single_select',
        required: false,
        filterable: true,
        searchable: true,
        options: [
          { id: 'ikea', label: 'Ikea' },
          { id: 'mondo_convenienza', label: 'Mondo Convenienza' },
          { id: 'conforama', label: 'Conforama' },
          { id: 'altro', label: 'Altro' },
        ],
      },
    ],
  },

  {
    id: 'cucina',
    name: 'Cucina',
    attributes: [
      {
        id: 'brand',
        label: 'Marca',
        type: 'single_select',
        required: false,
        filterable: true,
        searchable: true,
        options: [
          { id: 'scavolini', label: 'Scavolini' },
          { id: 'lube', label: 'Lube' },
          { id: 'veneta_cucine', label: 'Veneta Cucine' },
          { id: 'ikea', label: 'Ikea' },
          { id: 'altro', label: 'Altro' },
        ],
      },
    ],
  },

  {
    id: 'bagno',
    name: 'Bagno',
    attributes: [
      {
        id: 'brand',
        label: 'Marca',
        type: 'single_select',
        required: false,
        filterable: true,
        searchable: true,
        options: [
          { id: 'ideal_standard', label: 'Ideal Standard' },
          { id: 'grohe', label: 'Grohe' },
          { id: 'geberit', label: 'Geberit' },
          { id: 'altro', label: 'Altro' },
        ],
      },
    ],
  },

  {
    id: 'illuminazione',
    name: 'Illuminazione',
    attributes: [
      {
        id: 'brand',
        label: 'Marca',
        type: 'single_select',
        required: false,
        filterable: true,
        searchable: true,
        options: [
          { id: 'philips', label: 'Philips' },
          { id: 'artemide', label: 'Artemide' },
          { id: 'flos', label: 'Flos' },
          { id: 'ikea', label: 'Ikea' },
          { id: 'altro', label: 'Altro' },
        ],
      },
    ],
  },

  {
    id: 'decorazioni',
    name: 'Decorazioni',
    attributes: [
      {
        id: 'brand',
        label: 'Marca',
        type: 'single_select',
        required: false,
        filterable: true,
        searchable: true,
        options: [
          { id: 'ikea', label: 'Ikea' },
          { id: 'maisons_du_monde', label: 'Maisons du Monde' },
          { id: 'zara_home', label: 'Zara Home' },
          { id: 'altro', label: 'Altro' },
        ],
      },
    ],
  },

  {
    id: 'giardino',
    name: 'Giardino e terrazzo',
    attributes: [
      {
        id: 'brand',
        label: 'Marca',
        type: 'single_select',
        required: false,
        filterable: true,
        searchable: true,
        options: [
          { id: 'leroy_merlin', label: 'Leroy Merlin' },
          { id: 'ikea', label: 'Ikea' },
          { id: 'keter', label: 'Keter' },
          { id: 'altro', label: 'Altro' },
        ],
      },
    ],
  },

  {
    id: 'elettrodomestici',
    name: 'Elettrodomestici',
    attributes: [
      {
        id: 'brand',
        label: 'Marca',
        type: 'single_select',
        required: false,
        filterable: true,
        searchable: true,
        options: [
          { id: 'bosch', label: 'Bosch' },
          { id: 'samsung', label: 'Samsung' },
          { id: 'lg', label: 'LG' },
          { id: 'whirlpool', label: 'Whirlpool' },
          { id: 'electrolux', label: 'Electrolux' },
          { id: 'beko', label: 'Beko' },
          { id: 'miele', label: 'Miele' },
          { id: 'altro', label: 'Altro' },
        ],
      },
    ],
  },

  {
    id: 'altro',
    name: 'Altro',
    attributes: [],
  },
],
  },

    {
    id: 'animals',
    name: 'Animali',
    shortName: 'Animali',
    icon: PawPrint,
    color: '#10B981',
    chipColor: 'bg-emerald-500',
    optionalLocation: true,
    subcategories: [
      {
        id: 'food_snacks',
        name: 'Cibo e snack',
        attributes: [],
      },
      {
        id: 'toys',
        name: 'Giochi',
        attributes: [],
      },
      {
        id: 'beds_kennels',
        name: 'Cucce, letti e cuscini',
        attributes: [],
      },
      {
        id: 'collars_leashes_harnesses',
        name: 'Collari, guinzagli e pettorine',
        attributes: [],
      },
      {
        id: 'carriers_travel',
        name: 'Trasportini e viaggio',
        attributes: [],
      },
      {
        id: 'bowls_feeders',
        name: 'Ciotole e distributori',
        attributes: [],
      },
      {
        id: 'hygiene_grooming',
        name: 'Igiene e cura',
        attributes: [],
      },
      {
        id: 'cat_accessories',
        name: 'Tiragraffi e accessori per gatti',
        attributes: [],
      },
      {
        id: 'aquariums',
        name: 'Acquari e accessori',
        attributes: [],
      },
      {
        id: 'cages_habitats',
        name: 'Gabbie, recinti e habitat',
        attributes: [],
      },
      {
        id: 'clothing_accessories',
        name: 'Abbigliamento e accessori',
        attributes: [],
      },
      {
        id: 'other',
        name: 'Altro per animali',
        attributes: [],
      },
    ],
  },

  {
    id: 'vehicles',
    name: 'Motori',
    shortName: 'Motori',
    icon: Car,
    color: '#475569',
    chipColor: 'bg-slate-600',
    optionalLocation: true,
    subcategories: [
  {
    id: 'auto',
    name: 'Auto',
    attributes: [
      {
        id: 'brand',
        label: 'Marca',
        type: 'single_select',
        required: false,
        filterable: true,
        searchable: true,
        options: [
          { id: 'abarth', label: 'Abarth' },
          { id: 'alfa_romeo', label: 'Alfa Romeo' },
          { id: 'audi', label: 'Audi' },
          { id: 'bmw', label: 'BMW' },
          { id: 'citroen', label: 'Citroën' },
          { id: 'dacia', label: 'Dacia' },
          { id: 'fiat', label: 'Fiat' },
          { id: 'ford', label: 'Ford' },
          { id: 'honda', label: 'Honda' },
          { id: 'hyundai', label: 'Hyundai' },
          { id: 'jeep', label: 'Jeep' },
          { id: 'kia', label: 'Kia' },
          { id: 'lancia', label: 'Lancia' },
          { id: 'mercedes_benz', label: 'Mercedes-Benz' },
          { id: 'nissan', label: 'Nissan' },
          { id: 'opel', label: 'Opel' },
          { id: 'peugeot', label: 'Peugeot' },
          { id: 'renault', label: 'Renault' },
          { id: 'seat', label: 'Seat' },
          { id: 'skoda', label: 'Škoda' },
          { id: 'suzuki', label: 'Suzuki' },
          { id: 'tesla', label: 'Tesla' },
          { id: 'toyota', label: 'Toyota' },
          { id: 'volkswagen', label: 'Volkswagen' },
          { id: 'volvo', label: 'Volvo' },
          { id: 'altro', label: 'Altro' },
        ],
      },
    ],
  },

  {
    id: 'moto',
    name: 'Moto',
    attributes: [
      {
        id: 'brand',
        label: 'Marca',
        type: 'single_select',
        required: false,
        filterable: true,
        searchable: true,
        options: [
          { id: 'aprilia', label: 'Aprilia' },
          { id: 'bmw', label: 'BMW' },
          { id: 'ducati', label: 'Ducati' },
          { id: 'harley_davidson', label: 'Harley-Davidson' },
          { id: 'honda', label: 'Honda' },
          { id: 'kawasaki', label: 'Kawasaki' },
          { id: 'ktm', label: 'KTM' },
          { id: 'moto_guzzi', label: 'Moto Guzzi' },
          { id: 'suzuki', label: 'Suzuki' },
          { id: 'triumph', label: 'Triumph' },
          { id: 'yamaha', label: 'Yamaha' },
          { id: 'altro', label: 'Altro' },
        ],
      },
    ],
  },

  {
    id: 'scooter',
    name: 'Scooter',
    attributes: [
      {
        id: 'brand',
        label: 'Marca',
        type: 'single_select',
        required: false,
        filterable: true,
        searchable: true,
        options: [
          { id: 'aprilia', label: 'Aprilia' },
          { id: 'honda', label: 'Honda' },
          { id: 'kymco', label: 'Kymco' },
          { id: 'piaggio', label: 'Piaggio' },
          { id: 'sym', label: 'SYM' },
          { id: 'vespa', label: 'Vespa' },
          { id: 'yamaha', label: 'Yamaha' },
          { id: 'altro', label: 'Altro' },
        ],
      },
    ],
  },

  {
    id: 'furgoni',
    name: 'Furgoni e veicoli commerciali',
    attributes: [
      {
        id: 'brand',
        label: 'Marca',
        type: 'single_select',
        required: false,
        filterable: true,
        searchable: true,
        options: [
          { id: 'citroen', label: 'Citroën' },
          { id: 'fiat', label: 'Fiat' },
          { id: 'ford', label: 'Ford' },
          { id: 'iveco', label: 'Iveco' },
          { id: 'mercedes_benz', label: 'Mercedes-Benz' },
          { id: 'opel', label: 'Opel' },
          { id: 'peugeot', label: 'Peugeot' },
          { id: 'renault', label: 'Renault' },
          { id: 'volkswagen', label: 'Volkswagen' },
          { id: 'altro', label: 'Altro' },
        ],
      },
    ],
  },

  {
    id: 'camper',
    name: 'Camper e roulotte',
    attributes: [
      {
        id: 'brand',
        label: 'Marca',
        type: 'single_select',
        required: false,
        filterable: true,
        searchable: true,
        options: [
          { id: 'adria', label: 'Adria' },
          { id: 'arca', label: 'Arca' },
          { id: 'caravan_international', label: 'Caravan International' },
          { id: 'hymer', label: 'Hymer' },
          { id: 'laika', label: 'Laika' },
          { id: 'rimor', label: 'Rimor' },
          { id: 'altro', label: 'Altro' },
        ],
      },
    ],
  },

  {
    id: 'ricambi',
    name: 'Ricambi',
    attributes: [
      {
        id: 'type',
        label: 'Tipologia',
        type: 'single_select',
        required: false,
        filterable: true,
        searchable: true,
        options: [
          { id: 'motore', label: 'Motore' },
          { id: 'carrozzeria', label: 'Carrozzeria' },
          { id: 'elettronica', label: 'Elettronica' },
          { id: 'pneumatici', label: 'Pneumatici' },
          { id: 'cerchi', label: 'Cerchi' },
          { id: 'interni', label: 'Interni' },
          { id: 'altro', label: 'Altro' },
        ],
      },
    ],
  },

  {
    id: 'accessori',
    name: 'Accessori',
    attributes: [
      {
        id: 'type',
        label: 'Tipologia',
        type: 'single_select',
        required: false,
        filterable: true,
        searchable: true,
        options: [
          { id: 'navigazione', label: 'Navigazione' },
          { id: 'audio', label: 'Audio' },
          { id: 'portapacchi', label: 'Portapacchi' },
          { id: 'seggiolini', label: 'Seggiolini' },
          { id: 'caschi', label: 'Caschi' },
          { id: 'abbigliamento_tecnico', label: 'Abbigliamento tecnico' },
          { id: 'altro', label: 'Altro' },
        ],
      },
    ],
  },

  {
    id: 'altro',
    name: 'Altro',
    attributes: [],
  },
],
  },

  {
    id: 'auctions',
    name: 'Aste e fallimenti',
    shortName: 'Aste',
    icon: Gavel,
    color: '#EF4444',
    chipColor: 'bg-red-500',
    optionalLocation: false,
    subcategories: [
  {
    id: 'immobiliari',
    name: 'Aste immobiliari',
    attributes: [
      {
        id: 'type',
        label: 'Tipologia',
        type: 'single_select',
        required: false,
        filterable: true,
        searchable: true,
        options: [
          { id: 'abitazione', label: 'Abitazione' },
          { id: 'locale_commerciale', label: 'Locale commerciale' },
          { id: 'terreno', label: 'Terreno' },
          { id: 'capannone', label: 'Capannone' },
          { id: 'ufficio', label: 'Ufficio' },
          { id: 'altro', label: 'Altro' },
        ],
      },
    ],
  },

  {
    id: 'veicoli',
    name: 'Aste di veicoli',
    attributes: [
      {
        id: 'type',
        label: 'Tipologia',
        type: 'single_select',
        required: false,
        filterable: true,
        searchable: true,
        options: [
          { id: 'auto', label: 'Auto' },
          { id: 'moto', label: 'Moto' },
          { id: 'furgone', label: 'Furgone' },
          { id: 'camion', label: 'Camion' },
          { id: 'altro', label: 'Altro' },
        ],
      },
    ],
  },

  {
    id: 'beni_mobili',
    name: 'Aste di beni mobili',
    attributes: [
      {
        id: 'type',
        label: 'Tipologia',
        type: 'single_select',
        required: false,
        filterable: true,
        searchable: true,
        options: [
          { id: 'arredamento', label: 'Arredamento' },
          { id: 'elettronica', label: 'Elettronica' },
          { id: 'gioielli', label: 'Gioielli' },
          { id: 'opere_arte', label: "Opere d'arte" },
          { id: 'altro', label: 'Altro' },
        ],
      },
    ],
  },

  {
    id: 'aziendali',
    name: 'Aste aziendali',
    attributes: [
      {
        id: 'type',
        label: 'Tipologia',
        type: 'single_select',
        required: false,
        filterable: true,
        searchable: true,
        options: [
          { id: 'attrezzature', label: 'Attrezzature' },
          { id: 'macchinari', label: 'Macchinari' },
          { id: 'scorte', label: 'Scorte' },
          { id: 'veicoli', label: 'Veicoli' },
          { id: 'altro', label: 'Altro' },
        ],
      },
    ],
  },

  {
    id: 'fallimentari',
    name: 'Procedure fallimentari',
    attributes: [
      {
        id: 'type',
        label: 'Tipologia',
        type: 'single_select',
        required: false,
        filterable: true,
        searchable: true,
        options: [
          { id: 'attivita_completa', label: 'Attività completa' },
          { id: 'beni_aziendali', label: 'Beni aziendali' },
          { id: 'scorte', label: 'Scorte' },
          { id: 'immobili', label: 'Immobili' },
          { id: 'altro', label: 'Altro' },
        ],
      },
    ],
  },
],
  },

  {
    id: 'free_deals',
    name: 'Occasioni gratis',
    shortName: 'Gratis',
    icon: Gift,
    color: '#16A34A',
    chipColor: 'bg-green-600',
    optionalLocation: true,
   subcategories: [
  {
    id: 'mobili',
    name: 'Mobili',
    attributes: [],
  },
  {
    id: 'elettronica',
    name: 'Elettronica',
    attributes: [],
  },
  {
    id: 'abbigliamento',
    name: 'Abbigliamento',
    attributes: [],
  },
  {
    id: 'libri',
    name: 'Libri',
    attributes: [],
  },
  {
    id: 'giocattoli',
    name: 'Giocattoli',
    attributes: [],
  },
  {
    id: 'animali',
    name: 'Articoli per animali',
    attributes: [],
  },
  {
    id: 'altro',
    name: 'Altro',
    attributes: [],
  },
],
  },

  {
    id: 'user_reported',
    name: 'Segnalata dagli utenti',
    shortName: 'Segnalazioni',
    icon: Star,
    color: '#F97316',
    chipColor: 'bg-orange-500',
    optionalLocation: false,
    subcategories: [],
  },

  {
    id: 'job_offers',
    name: 'Offerte di lavoro',
    shortName: 'Lavoro',
    icon: Briefcase,
    color: '#2563EB',
    chipColor: 'bg-blue-600',
    optionalLocation: false,
    subcategories: [
  { id: 'amministrazione', name: 'Amministrazione e contabilità' },
  { id: 'commercio', name: 'Commercio e vendite' },
  { id: 'ristorazione', name: 'Ristorazione' },
  { id: 'turismo', name: 'Turismo e alberghi' },
  { id: 'logistica', name: 'Logistica e magazzino' },
  { id: 'trasporti', name: 'Trasporti' },
  { id: 'edilizia', name: 'Edilizia' },
  { id: 'produzione', name: 'Produzione e industria' },
  { id: 'informatica', name: 'Informatica' },
  { id: 'comunicazione', name: 'Comunicazione e pubblicità' },
  { id: 'sanita', name: 'Sanità e assistenza' },
  { id: 'istruzione', name: 'Istruzione e formazione' },
  { id: 'sicurezza', name: 'Sicurezza' },
  { id: 'pulizie', name: 'Pulizie' },
  { id: 'servizi_persona', name: 'Servizi alla persona' },
  { id: 'agricoltura', name: 'Agricoltura' },
  { id: 'lavoro_casa', name: 'Lavoro da casa' },
  { id: 'altro', name: 'Altro' },
].map((subcategory) => ({
  ...subcategory,
  attributes: [
    {
      id: 'type',
      label: 'Tipo di contratto',
      type: 'single_select',
      required: false,
      filterable: true,
      searchable: true,
      options: [
        { id: 'tempo_indeterminato', label: 'Tempo indeterminato' },
        { id: 'tempo_determinato', label: 'Tempo determinato' },
        { id: 'tempo_pieno', label: 'Tempo pieno' },
        { id: 'tempo_parziale', label: 'Tempo parziale' },
        { id: 'apprendistato', label: 'Apprendistato' },
        { id: 'tirocinio', label: 'Tirocinio' },
        { id: 'collaborazione', label: 'Collaborazione' },
        { id: 'lavoro_autonomo', label: 'Lavoro autonomo' },
        { id: 'lavoro_occasionale', label: 'Lavoro occasionale' },
        { id: 'lavoro_stagionale', label: 'Lavoro stagionale' },
      ],
    },
  ],
})),
  },

  {
    id: 'rental_homes',
    name: 'Case in affitto',
    shortName: 'Affitti',
    icon: House,
    color: '#7C3AED',
    chipColor: 'bg-violet-600',
    optionalLocation: false,
    subcategories: [
      'Appartamento',
      'Monolocale',
      'Bilocale',
      'Trilocale',
      'Casa indipendente',
      'Villa',
      'Stanza singola',
      'Stanza condivisa',
      'Posto letto',
      'Ufficio',
      'Locale commerciale',
      'Magazzino',
      'Garage',
      'Terreno',
      'Casa vacanze',
      'Altro',
    ].map((name) => ({
  id: name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, ''),

  name,

  attributes: [
    {
      id: 'features',
      label: 'Caratteristiche',
      type: 'multi_select',
      required: false,
      filterable: true,
      searchable: true,

      options: [
        { id: 'furnished', label: 'Arredato' },
        { id: 'unfurnished', label: 'Non arredato' },
        { id: 'balcony', label: 'Con balcone' },
        { id: 'terrace', label: 'Con terrazzo' },
        { id: 'garden', label: 'Con giardino' },
        { id: 'garage', label: 'Con garage' },
        { id: 'parking_space', label: 'Con posto auto' },
        { id: 'elevator', label: 'Con ascensore' },
        { id: 'suitable_for_students', label: 'Adatto a studenti' },
        { id: 'suitable_for_workers', label: 'Adatto a lavoratori' },
        { id: 'suitable_for_families', label: 'Adatto a famiglie' },
        { id: 'pets_allowed', label: 'Animali ammessi' },
        {
          id: 'no_condominium_fees',
          label: 'Senza spese condominiali',
        },
      ],
    },
  ],
})),
  },

  {
    id: 'other',
    name: 'Altro',
    shortName: 'Altro',
    icon: Boxes,
    color: '#6B7280',
    chipColor: 'bg-gray-500',
    optionalLocation: true,
    subcategories: [],
  },
];


// Categorie aggiuntive introdotte dal nuovo flusso di pubblicazione.
// Gli ID sono stabili e possono essere usati da filtri, mappa e notifiche.
if (!categories.some((category) => category.id === 'entertainment')) {
  categories.splice(categories.findIndex((category) => category.id === 'other'), 0, {
    id: 'entertainment',
    name: 'Intrattenimento',
    shortName: 'Intrattenimento',
    icon: Clapperboard,
    color: '#7C3AED',
    chipColor: 'bg-violet-600',
    optionalLocation: true,
    subcategories: [
      { id: 'movies_series', name: 'Film e serie TV', attributes: [] },
      { id: 'music', name: 'Musica e vinili', attributes: [] },
      { id: 'books_comics', name: 'Libri e fumetti', attributes: [] },
      { id: 'videogames', name: 'Videogiochi e console', attributes: [] },
      { id: 'events_tickets', name: 'Eventi e biglietti', attributes: [] },
      { id: 'other', name: 'Altro', attributes: [] },
    ],
  });
}

if (!categories.some((category) => category.id === 'school_office')) {
  categories.splice(categories.findIndex((category) => category.id === 'other'), 0, {
    id: 'school_office',
    name: 'Scuola e ufficio',
    shortName: 'Scuola e ufficio',
    icon: BookOpen,
    color: '#2563EB',
    chipColor: 'bg-blue-600',
    optionalLocation: true,
    subcategories: [
      { id: 'school_supplies', name: 'Materiale scolastico', attributes: [] },
      { id: 'stationery', name: 'Cancelleria', attributes: [] },
      { id: 'books', name: 'Libri e manuali', attributes: [] },
      { id: 'office_furniture', name: 'Arredo ufficio', attributes: [] },
      { id: 'office_equipment', name: 'Attrezzatura da ufficio', attributes: [] },
      { id: 'other', name: 'Altro', attributes: [] },
    ],
  });
}

// Metadato non visibile usato per conservare Donna/Uomo/Bambini anche quando
// la sottocategoria scelta è Scarpe, Borse o Accessori.
const clothingCategory = categories.find((category) => category.id === 'clothing');
if (clothingCategory) {
  clothingCategory.name = 'Moda e abbigliamento';
  clothingCategory.shortName = 'Moda';

  const audienceOptions = [
    { id: 'donna', label: 'Donna' },
    { id: 'uomo', label: 'Uomo' },
    { id: 'bambini', label: 'Bambini' },
  ];

  clothingCategory.subcategories.forEach((subcategory) => {
    if (!['scarpe', 'borse', 'accessori', 'altro'].includes(subcategory.id)) return;
    const attributes = Array.isArray(subcategory.attributes) ? subcategory.attributes : [];
    if (!attributes.some((attribute) => attribute.id === 'audience')) {
      subcategory.attributes = [
        ...attributes,
        {
          id: 'audience',
          label: 'Destinatario',
          type: 'single_select',
          required: false,
          filterable: true,
          searchable: true,
          hiddenInForm: true,
          options: audienceOptions,
        },
      ];
    }
  });
}

const hobbiesCategory = categories.find(
  (category) => category.id === 'games_sports_hobbies'
);
if (hobbiesCategory) {
  hobbiesCategory.name = 'Hobby, sport e collezionismo';
  hobbiesCategory.shortName = 'Hobby e sport';
}

export const categoryFilterOptions = [
  {
    id: 'all',
    name: 'Tutte',
    shortName: 'Tutte',
    icon: Boxes,
    color: '#6B7280',
    chipColor: 'bg-gray-500',
  },
  ...categories,
];

export const categoryById = Object.fromEntries(
  categories.map((category) => [category.id, category])
);

export const getCategoryById = (categoryId) => {
  return categoryById[categoryId] || null;
};

export const getSubcategories = (categoryId) => {
  return getCategoryById(categoryId)?.subcategories || [];
};

export const getSubcategoryById = (categoryId, subcategoryId) => {
  return (
    getSubcategories(categoryId).find(
      (subcategory) => subcategory.id === subcategoryId
    ) || null
  );
};

const createCatalogId = (value = '') => {
  return String(value)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
};

const normalizeAttributeOption = (option) => {
  if (typeof option === 'string') {
    return {
      id: createCatalogId(option),
      label: option,
    };
  }

  if (!option || typeof option !== 'object') {
    return null;
  }

  const label = option.label || option.name || option.id || '';
  const id = option.id || createCatalogId(label);

  if (!id || !label) {
    return null;
  }

  return {
    ...option,
    id,
    label,
  };
};

const normalizeAttribute = (attribute) => {
  if (!attribute || typeof attribute !== 'object') {
    return null;
  }

  const multiple =
    attribute.type === 'multi_select' ||
    Boolean(attribute.multiple);

  const type =
    attribute.type ||
    (multiple ? 'multi_select' : 'single_select');

  return {
    ...attribute,
    id: attribute.id || createCatalogId(attribute.label),
    label: attribute.label || '',
    type,
    required: Boolean(attribute.required),
    multiple,
    options: (attribute.options || [])
      .map(normalizeAttributeOption)
      .filter(Boolean),
  };
};

export const getSubcategoryAttributes = (
  categoryId,
  subcategoryId
) => {
  const subcategory = getSubcategoryById(
    categoryId,
    subcategoryId
  );

  if (!subcategory) {
    return [];
  }

  /*
   * Nuova struttura definitiva.
   *
   * Una sottocategoria potrà avere uno o più attributi:
   * marca, condizione, anno, contratto, caratteristiche, ecc.
   */
  if (Array.isArray(subcategory.attributes)) {
    return subcategory.attributes
      .map(normalizeAttribute)
      .filter(Boolean);
  }

  /*
   * Compatibilità temporanea con la struttura legacy:
   *
   * thirdLevelLabel
   * thirdLevelRequired
   * thirdLevelMultiple
   * thirdLevelOptions
   */
  const legacyLabel = subcategory.thirdLevelLabel || '';
  const legacyOptions = subcategory.thirdLevelOptions || [];

  if (!legacyLabel && legacyOptions.length === 0) {
    return [];
  }

  const legacyAttribute = normalizeAttribute({
    id: 'third_level',
    label: legacyLabel,
    type: subcategory.thirdLevelMultiple
      ? 'multi_select'
      : 'single_select',
    required: Boolean(subcategory.thirdLevelRequired),
    multiple: Boolean(subcategory.thirdLevelMultiple),
    options: legacyOptions,
  });

  return legacyAttribute ? [legacyAttribute] : [];
};

export const getThirdLevelConfiguration = (
  categoryId,
  subcategoryId
) => {
  const firstAttribute =
    getSubcategoryAttributes(categoryId, subcategoryId)[0];

  if (!firstAttribute) {
    return {
      label: '',
      required: false,
      multiple: false,
      options: [],
    };
  }

  return {
    label: firstAttribute.label,
    required: firstAttribute.required,
    multiple: firstAttribute.multiple,
    options: firstAttribute.options.map(
      (option) => option.label
    ),
  };
};

export const optionalLocationCategoryIds = categories
  .filter((category) => category.optionalLocation)
  .map((category) => category.id);