import { mroboticsRequest } from './client.js';
import { mapperService } from './mapper.service.js';

const OPERATOR_RANGES = [
  {
    code: 'JIO', operator: 'Jio', providerCode: '5',
    ranges: [
      [6000, 6009], [6100, 6109], [6200, 6209], [6300, 6349],
      [6370, 6399], [6700, 6799], [6800, 6899], [6900, 6999],
      [7000, 7099], [7200, 7299], [7300, 7399], [7400, 7499],
      [7500, 7599], [7600, 7699], [7700, 7799], [7800, 7899],
      [7900, 7999], [8000, 8099], [8100, 8199], [8200, 8299],
      [8800, 8899], [8900, 8999], [9050, 9099],
      [9152, 9159], [9500, 9529], [9550, 9599],
      [9650, 9699], [9990, 9999],
    ],
  },
  {
    code: 'AIRTEL', operator: 'Airtel', providerCode: '2',
    ranges: [
      [6260, 6269], [6350, 6369], [7200, 7209], [7400, 7419],
      [7680, 7699], [8290, 8299], [8510, 8519],
      [9700, 9709], [9710, 9719], [9810, 9819],
      [9820, 9839], [9900, 9909], [9958, 9959],
      [8320, 8329], [7860, 7869], [9915, 9919],
    ],
  },
  {
    code: 'VI', operator: 'Vodafone', providerCode: '1',
    ranges: [
      [6280, 6299], [7500, 7509], [7600, 7609],
      [7700, 7719], [8048, 8049], [8050, 8059],
      [9600, 9619], [9820, 9829], [9860, 9869],
      [9870, 9879], [9930, 9939], [9960, 9969],
      [9890, 9899],
    ],
  },
  {
    code: 'IDEA', operator: 'Idea', providerCode: '3',
    ranges: [
      [6240, 6259], [9320, 9399], [9760, 9779],
      [9420, 9429], [8800, 8809],
    ],
  },
  {
    code: 'BSNL', operator: 'BSNL', providerCode: '4',
    ranges: [
      [7479, 7479], [7480, 7489], [7550, 7559],
      [9400, 9414], [9415, 9459], [9450, 9479],
      [9470, 9479], [9480, 9489], [9490, 9499],
      [9868, 9869],
    ],
  },
];

const FALLBACK_MAP = {
  '98': { code: 'AIRTEL',  operator: 'Airtel',   providerCode: '2' },
  '99': { code: 'AIRTEL',  operator: 'Airtel',   providerCode: '2' },
  '70': { code: 'JIO',     operator: 'Jio',      providerCode: '5' },
  '71': { code: 'JIO',     operator: 'Jio',      providerCode: '5' },
  '72': { code: 'JIO',     operator: 'Jio',      providerCode: '5' },
  '73': { code: 'JIO',     operator: 'Jio',      providerCode: '5' },
  '74': { code: 'JIO',     operator: 'Jio',      providerCode: '5' },
  '75': { code: 'JIO',     operator: 'Jio',      providerCode: '5' },
  '76': { code: 'JIO',     operator: 'Jio',      providerCode: '5' },
  '77': { code: 'JIO',     operator: 'Jio',      providerCode: '5' },
  '78': { code: 'JIO',     operator: 'Jio',      providerCode: '5' },
  '79': { code: 'JIO',     operator: 'Jio',      providerCode: '5' },
  '80': { code: 'JIO',     operator: 'Jio',      providerCode: '5' },
  '81': { code: 'JIO',     operator: 'Jio',      providerCode: '5' },
  '82': { code: 'JIO',     operator: 'Jio',      providerCode: '5' },
  '83': { code: 'JIO',     operator: 'Jio',      providerCode: '5' },
  '63': { code: 'JIO',     operator: 'Jio',      providerCode: '5' },
  '65': { code: 'JIO',     operator: 'Jio',      providerCode: '5' },
  '66': { code: 'JIO',     operator: 'Jio',      providerCode: '5' },
  '67': { code: 'JIO',     operator: 'Jio',      providerCode: '5' },
  '68': { code: 'JIO',     operator: 'Jio',      providerCode: '5' },
  '69': { code: 'JIO',     operator: 'Jio',      providerCode: '5' },
  '62': { code: 'VI',      operator: 'Vodafone', providerCode: '1' },
  '96': { code: 'VI',      operator: 'Vodafone', providerCode: '1' },
  '97': { code: 'VI',      operator: 'Vodafone', providerCode: '1' },
  '94': { code: 'BSNL',    operator: 'BSNL',     providerCode: '4' },
  '95': { code: 'BSNL',    operator: 'BSNL',     providerCode: '4' },
};

const detectByPrefix = (mobile) => {
  const digits = mobile.replace(/\D/g, '').slice(0, 10);
  const prefix4 = parseInt(digits.slice(0, 4), 10);

  for (const entry of OPERATOR_RANGES) {
    for (const [min, max] of entry.ranges) {
      if (prefix4 >= min && prefix4 <= max) {
        return { operator: entry.operator, code: entry.code, providerCode: entry.providerCode };
      }
    }
  }

  const prefix2 = digits.slice(0, 2);
  if (FALLBACK_MAP[prefix2]) {
    return FALLBACK_MAP[prefix2];
  }

  return null;
};

export const mroboticsOperatorService = {
  async getOperators() {
    const raw = await mroboticsRequest({
      method: 'GET',
      endpoint: '/api/operator_balance',
      data: {},
    });
    return mapperService.mapOperatorList(raw);
  },

  async detectOperator(mobileNumber) {
    const detected = detectByPrefix(mobileNumber);
    if (detected) {
      return {
        mobile:       mobileNumber,
        operator:     detected.operator,
        operatorCode: detected.code,
        providerCode: detected.providerCode,
        circleCode:   null,
        circle:       null,
        source:       'local',
      };
    }

    return {
      mobile:       mobileNumber,
      operator:     null,
      operatorCode: null,
      providerCode: null,
      circleCode:   null,
      circle:       null,
      source:       'undetected',
    };
  },
};
