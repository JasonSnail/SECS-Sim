import { TestScenario, StandardType, ParameterType } from './types';

export const TEST_SCENARIOS: TestScenario[] = [
  {
    id: 'e9-comm-est',
    title: 'E9: Establish Communications',
    standard: StandardType.E9,
    description: 'Basic handshake to establish connection using S1F13.',
    steps: [
      {
        name: 'Are You There?',
        description: 'Check if equipment is alive.',
        messageToSend: { stream: 1, function: 1, waitBit: true, name: 'Are You There Request', body: {} },
        expectedResponseSxFy: 'S1F2',
        timeout: 5000
      },
      {
        name: 'Establish Comm',
        description: 'Request to establish communications.',
        messageToSend: { stream: 1, function: 13, waitBit: true, name: 'Establish Comm Request', body: { "COMMACK": 0 } },
        expectedResponseSxFy: 'S1F14',
        timeout: 5000
      }
    ]
  },
  {
    id: 'e9-online-control',
    title: 'E9: Online/Remote Control',
    standard: StandardType.E9,
    description: 'Transition equipment to Online Remote mode.',
    steps: [
      {
        name: 'Go Online',
        description: 'Request equipment to go online.',
        messageToSend: { stream: 1, function: 17, waitBit: true, name: 'Request ON-LINE', body: {} },
        expectedResponseSxFy: 'S1F18',
        timeout: 10000
      },
      {
        name: 'Remote Command (START)',
        description: 'Send remote command to START processing.',
        messageToSend: { 
          stream: 2, 
          function: 41, 
          waitBit: true, 
          name: 'Host Command Send', 
          body: {
            "RCMD": "START",
            "CPNAME": "LOT_ID",
            "CPVAL": "TEST_LOT_001"
          } 
        },
        expectedResponseSxFy: 'S2F42',
        timeout: 10000
      }
    ]
  },
  {
    id: 'e9-timeout',
    title: 'E9: Timeout Handling (Negative Test)',
    standard: StandardType.E9,
    description: 'Demonstrates T3 Timeout behavior. The second step is configured to fail (Simulated Delay > Timeout).',
    steps: [
      {
        name: 'Normal Ping',
        description: 'Standard latency (500ms). Timeout is 5s. Should Pass.',
        messageToSend: { stream: 1, function: 1, waitBit: true, name: 'Are You There', body: {} },
        expectedResponseSxFy: 'S1F2',
        timeout: 5000,
        simulateDelay: 500
      },
      {
        name: 'Slow Response (Fail)',
        description: 'Equipment takes 8s to respond, but Timeout is set to 2s. Should Fail.',
        messageToSend: { stream: 1, function: 13, waitBit: true, name: 'Establish Comm', body: { "COMMACK": 0 } },
        expectedResponseSxFy: 'S1F14',
        timeout: 2000, 
        simulateDelay: 8000
      }
    ]
  },
  {
    id: 'e142-map-transfer',
    title: 'E142: Substrate Map Transfer',
    standard: StandardType.E142,
    description: 'Request a wafer map from the equipment (S12F1).',
    steps: [
      {
        name: 'Map Setup Data',
        description: 'Send setup data for mapping.',
        messageToSend: { 
            stream: 12, 
            function: 3, 
            waitBit: true, 
            name: 'Map Setup Data Send', 
            body: { "MID": "WAFER_01", "IDTYP": "WAFER" } 
        },
        expectedResponseSxFy: 'S12F4',
        timeout: 10000
      },
      {
        name: 'Request Map',
        description: 'Request the bin map for specific substrate.',
        messageToSend: { 
          stream: 12, 
          function: 1, 
          waitBit: true, 
          name: 'Map Data Request', 
          body: {
            "MID": "WAFER_01",
            "IDTYP": "WAFER",
            "MAPFT": 1, // Coordinate based
            "FNLOC": 0
          } 
        },
        expectedResponseSxFy: 'S12F2',
        timeout: 30000 // Large maps can take time
      }
    ]
  },
  {
    id: 'e142-obj-services',
    title: 'E142: Object Services (S14)',
    standard: StandardType.E142,
    description: 'Test Object Services (GetAttr, SetAttr, GetType) with configurable parameters for S14 commands.',
    parameters: [
      { 
        key: 'OBJID', 
        label: 'Object ID', 
        defaultValue: 'WaferMap_01', 
        description: 'Target Object Identifier',
        type: ParameterType.STRING 
      },
      { 
        key: 'ATTRID', 
        label: 'Attribute ID', 
        defaultValue: 'BinMap', 
        description: 'Attribute to query/set',
        type: ParameterType.STRING
      },
      { 
        key: 'NEWVAL', 
        label: 'Set Value', 
        defaultValue: '100', 
        description: 'Value for SetAttr (S14F3)',
        type: ParameterType.NUMBER,
        min: 0,
        max: 9999
      }
    ],
    steps: [
      {
        name: 'Get Attribute (S14F1)',
        description: 'Get specified attribute value.',
        messageToSend: { 
            stream: 14, 
            function: 1, 
            waitBit: true, 
            name: 'GetAttr', 
            body: { "OBJID": "{{OBJID}}", "OBJTYPE": "SubstrateMap", "ATTRID": ["{{ATTRID}}"] } 
        },
        expectedResponseSxFy: 'S14F2',
        timeout: 10000
      },
      {
        name: 'Set Attribute (S14F3)',
        description: 'Set specified attribute value.',
        messageToSend: { 
            stream: 14, 
            function: 3, 
            waitBit: true, 
            name: 'SetAttr', 
            body: { "OBJID": "{{OBJID}}", "OBJTYPE": "SubstrateMap", "ATTRID": "{{ATTRID}}", "ATTRDATA": "{{NEWVAL}}" } 
        },
        expectedResponseSxFy: 'S14F4',
        timeout: 10000
      },
      {
        name: 'Get Type (S14F5)',
        description: 'Get type of the object.',
        messageToSend: { 
            stream: 14, 
            function: 5, 
            waitBit: true, 
            name: 'GetType', 
            body: { "OBJID": "{{OBJID}}" } 
        },
        expectedResponseSxFy: 'S14F6',
        timeout: 5000
      }
    ]
  },
  {
    id: 'e142-trace-setup',
    title: 'E142: Trace Data Setup (S14F11)',
    standard: StandardType.E142,
    description: 'Discover object attributes (S14F11) to configure real-time tracing.',
    parameters: [
      { 
        key: 'OBJID', 
        label: 'Object ID', 
        defaultValue: 'WaferMap_01', 
        description: 'Target Object Identifier',
        type: ParameterType.STRING
      },
      { 
        key: 'OBJTYPE', 
        label: 'Object Type', 
        defaultValue: 'SubstrateMap', 
        description: 'Type of the object',
        type: ParameterType.ENUM,
        options: ['SubstrateMap', 'Equipment', 'Port', 'Carrier']
      }
    ],
    steps: [
      {
        name: 'Get Attr Names (S14F11)',
        description: 'Retrieve available attributes for the object to setup trace.',
        messageToSend: { 
            stream: 14, 
            function: 11, 
            waitBit: true, 
            name: 'GetAttrNames', 
            body: { "OBJID": "{{OBJID}}", "OBJTYPE": "{{OBJTYPE}}" } 
        },
        expectedResponseSxFy: 'S14F12',
        timeout: 5000
      }
    ]
  },
  {
    id: 'e142-trace-transmission',
    title: 'E142: Trace Data Transmission (S14F13)',
    standard: StandardType.E142,
    description: 'Initiate object attribute trace (S14F13) and verify acknowledgement (S14F14).',
    parameters: [
      { 
        key: 'OBJID', 
        label: 'Object ID', 
        defaultValue: 'WaferMap_01', 
        description: 'Target Object Identifier',
        type: ParameterType.STRING
      },
      { 
        key: 'ATTRLIST', 
        label: 'Attribute List', 
        defaultValue: 'ProcessState', 
        description: 'Attribute(s) to trace (e.g. Status)',
        type: ParameterType.STRING
      },
      { 
        key: 'INTERVAL', 
        label: 'Interval (ms)', 
        defaultValue: '1000', 
        description: 'Reporting interval in milliseconds',
        type: ParameterType.NUMBER,
        min: 100,
        max: 60000
      }
    ],
    steps: [
      {
        name: 'Establish Trace (S14F13)',
        description: 'Request equipment to start tracing specified attributes.',
        messageToSend: { 
            stream: 14, 
            function: 13, 
            waitBit: true, 
            name: 'Establish Trace Request', 
            body: { "OBJID": "{{OBJID}}", "ATTRID": ["{{ATTRLIST}}"], "DSPER": "{{INTERVAL}}" } 
        },
        expectedResponseSxFy: 'S14F14',
        timeout: 5000
      }
    ]
  }
];

export const MOCK_RESPONSES: Record<string, any> = {
  'S1F1': { "MDLN": "GEMINI-SIM-TOOL", "SOFTREV": "1.0.0" },
  'S1F13': { "COMMACK": 0, "MDLN": ["GEMINI-SIM-TOOL"], "SOFTREV": ["1.0.0"] },
  'S1F17': { "ONLACK": 0 },
  'S2F41': { "HCACK": 0, "CPNAME": [], "CPACK": [] },
  'S12F3': { "SDACK": 0 },
  'S12F1': {
    "MID": "WAFER_01",
    "IDTYP": "WAFER",
    "FNLOC": 0,
    "ORLOC": 1, // Center
    "RPSEL": 0,
    "REFP": [0,0],
    "DUTMS": "mm",
    "XDIUS": 300,
    "YDIUS": 300,
    "BINLT": ["01", "02", "03"], // Bin List
    "MLCL": 500 // Map Layout Count
  },
  'S14F2': { "OBJID": "WaferMap_01", "ATTRID": ["BinMap"], "ATTRDATA": ["001001001"] },
  'S14F4': { "OBJID": "WaferMap_01", "ATTRID": "BinMap", "ERRCODE": 0 },
  'S14F6': { "OBJID": "WaferMap_01", "OBJTYPE": "SubstrateMap" },
  'S14F12': { 
      "OBJID": "WaferMap_01", 
      "OBJTYPE": "SubstrateMap", 
      "ERRCODE": 0, 
      "ATTRID": ["BinMap", "Layout", "DimensionX", "DimensionY", "ProcessState"] 
  },
  'S14F14': {
      "OBJID": "WaferMap_01",
      "ATTRID": ["ProcessState"],
      "RAC": 0, // Reset Acknowledge Code (0 = Successful)
      "ERRCODE": 0
  }
};