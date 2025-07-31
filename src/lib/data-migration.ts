
'use server';

import { v4 as uuidv4 } from 'uuid';
import { db } from './firebase';
import { collection, writeBatch, getDocs, doc } from 'firebase/firestore';
import { AppSettings, Task, WorkflowCategory, SubCategory, ImportanceLevel, BidOrigin } from './types';

const providedData = {
  "settings": {
    "statuses": [
      {
        "name": "Not Started",
        "background": "#f2ea02",
        "border": "#dee2e6"
      },
      {
        "name": "Under Review",
        "background": "#13ef0b",
        "border": "#a5d8ff"
      },
      {
        "name": "For Approval (Adnan)",
        "background": "#2900f5",
        "border": "#ffec99"
      },
      {
        "name": "For Submission",
        "background": "#01feae",
        "border": "#96f2d7"
      }
    ],
    "subStatuses": [
      {
        "name": "For Payment",
        "parent": "For Submission",
        "color": "#d6336c"
      },
      {
        "name": "On-Hold",
        "parent": "For Submission",
        "color": "#fd7e14"
      },
      {
        "name": "With Bilal",
        "parent": "Under Review",
        "color": "#6c757d"
      },
      {
        "name": "With Osama",
        "parent": "Under Review",
        "color": "#6c757d"
      },
      {
        "name": "With Saed",
        "parent": "Under Review",
        "color": "#6c757d"
      }
    ],
    "importanceLevels": [
      {
        "name": "High",
        "color": "#e53935"
      },
      {
        "name": "Medium",
        "color": "#fdd835"
      },
      {
        "name": "Low",
        "color": "#43a047"
      },
      {
        "name": "None",
        "color": "#ffffff"
      }
    ],
    "bidOrigins": [
      { "name": "NUPCO" },
      { "name": "ETIMAD" },
      { "name": "SALES" },
      { "name": "E-Purchasing" },
      { "name": "Engineering" }
    ]
  },
  "tasks": [
    { "id": "t1721996832001", "status": "Completed", "date": "2025-07-15", "dueDate": "2025-07-27", "taskid": "1059 / 25071326 (995)", "desc": "-", "remarks": "25,185.00", "subStatus": "", "importance": "", "completionDate": "2025-07-17" },
    { "id": "t1721996832002", "date": "2025-07-15", "taskid": "1059 / 25071327 (996)", "desc": "-", "status": "Completed", "remarks": "2,735.85", "completionDate": "2025-07-17" },
    { "id": "t1721996832003", "status": "Completed", "date": "2025-07-15", "dueDate": "2025-07-17", "taskid": "949 / 25071406 (1000)", "desc": "-", "remarks": "Need to sent VIA email", "subStatus": "", "importance": "", "completionDate": "2025-07-17" },
    { "id": "t1721996832004", "date": "2025-07-15", "taskid": "Q-169 / 25071417 (1011)", "desc": "-", "status": "Completed", "remarks": "23,460.00", "completionDate": "2025-07-17" },
    { "id": "t1721996832005", "date": "2025-07-17", "taskid": "1093 / 25071507 (1017)", "desc": "-", "status": "Completed", "remarks": "C/O Earl", "completionDate": "2025-07-17" },
    { "id": "t1721996832006", "status": "Completed", "date": "2025-07-16", "dueDate": "2025-07-16", "taskid": "1059 / 25071308 (977)", "desc": "-", "remarks": "149,274.60", "subStatus": "", "importance": "Medium", "completionDate": "2025-07-16" },
    { "id": "t1721996832007", "status": "Completed", "date": "2025-07-16", "dueDate": "2025-07-17", "taskid": "E-46 / 25071609 (1023)", "desc": "-", "remarks": "50,400.00", "subStatus": "", "importance": "", "completionDate": "2025-07-16" },
    { "id": "t1721996832008", "status": "Completed", "date": "2025-07-16", "dueDate": "2025-07-17", "taskid": "Q-167 / 25071608 (1024)", "desc": "-", "remarks": "140,400.00", "subStatus": "", "importance": "", "completionDate": "2025-07-16" },
    { "id": "t1721996832009", "status": "Completed", "date": "2025-07-16", "dueDate": "2025-07-16", "taskid": "L-113/25071613(1029)", "desc": "-", "remarks": "21,333.14", "subStatus": "", "importance": "High", "completionDate": "2025-07-16" },
    { "id": "t1721996832010", "status": "Completed", "date": "2025-07-16", "dueDate": "2025-07-18", "taskid": "H-75 / 25071615 (1031)", "desc": "-", "remarks": "5,336.00", "subStatus": "", "importance": "High", "completionDate": "2025-07-17" },
    { "id": "t1721996832011", "date": "2025-07-16", "dueDate": "2025-07-17", "taskid": "285 / 25071614 (1030)", "desc": "-", "status": "Completed", "remarks": "287,385.00", "completionDate": "2025-07-16" },
    { "id": "t1721996832012", "date": "2025-07-15", "taskid": "G-61 / 25071329 (998)", "desc": "-", "status": "Completed", "remarks": "5,570.00", "completionDate": "2025-07-15" },
    { "id": "t1721996832013", "date": "2025-07-15", "taskid": "A-9 / 25071416 (1010)", "desc": "-", "status": "Completed", "remarks": "403,650.00", "completionDate": "2025-07-15" },
    { "id": "t1721996832014", "date": "2025-07-15", "taskid": "E-46 / 25071310 (979)", "desc": "-", "status": "Completed", "remarks": "47,361.60", "completionDate": "2025-07-15" },
    { "id": "t1721996832015", "date": "2025-07-15", "taskid": "E-46 / 25071314 (983)", "desc": "-", "status": "Completed", "remarks": "7,786.80", "completionDate": "2025-07-15" },
    { "id": "t1721996832016", "date": "2025-07-15", "taskid": "E-46 / 25071315 (984)", "desc": "-", "status": "Completed", "remarks": "12,480.00", "completionDate": "2025-07-15" },
    { "id": "t1721996832017", "date": "2025-07-15", "taskid": "E-46 / 25071318 (987)", "desc": "-", "status": "Completed", "remarks": "5,736.96", "completionDate": "2025-07-15" },
    { "id": "t1721996832018", "date": "2025-07-15", "taskid": "E-46 / 25071322 (991)", "desc": "-", "status": "Completed", "remarks": "29,484.00", "completionDate": "2025-07-15" },
    { "id": "t1721996832019", "date": "2025-07-15", "taskid": "E-46 / 25071413 (1007)", "desc": "-", "status": "Completed", "remarks": "43,993.00", "completionDate": "2025-07-15" },
    { "id": "t1721996832020", "date": "2025-07-15", "taskid": "E-46 / 25071414 (1008)", "desc": "-", "status": "Completed", "remarks": "42,804.00", "completionDate": "2025-07-15" },
    { "id": "t1721996832021", "date": "2025-07-15", "taskid": "E-46 / 25071415 (1009)", "desc": "-", "status": "Completed", "remarks": "16,646.00", "completionDate": "2025-07-15" },
    { "id": "t1721996832022", "date": "2025-07-15", "taskid": "H-75 / 25071316 (985)", "desc": "-", "status": "Completed", "remarks": "75,037.50", "completionDate": "2025-07-15" },
    { "id": "t1721996832023", "date": "2025-07-15", "taskid": "I-89 / 25071330 (999)", "desc": "-", "status": "Completed", "remarks": "329,026.50", "completionDate": "2025-07-15" },
    { "id": "t1721996832024", "date": "2025-07-15", "taskid": "L-113 / 25071409 (1003)", "desc": "-", "status": "Completed", "remarks": "27,202.56", "completionDate": "2025-07-15" },
    { "id": "t1721996832025", "date": "2025-07-15", "taskid": "E-46 / 25071319 (988)", "desc": "-", "status": "Completed", "remarks": "10,152.00", "completionDate": "2025-07-15" },
    { "id": "t1721996832026", "status": "Approved for Submission", "date": "2025-07-01", "dueDate": "2025-07-26", "taskid": "703/25070108(905)", "bidOrigin": "", "desc": "", "remarks": "Spare parts", "subStatus": "On-Hold", "importance": "Low" },
    { "id": "t1721996832027", "date": "2025-07-13", "taskid": "Q-167 25070809 (956)", "desc": "-", "status": "Completed", "remarks": "Submitted, 26,680.00", "completionDate": "2025-07-14" },
    { "id": "t1721996832028", "date": "2025-07-14", "taskid": "H-75/25071007 (967)", "desc": "-", "status": "Completed", "remarks": "Submitted, 5,847.75" },
    { "id": "t1721996832029", "date": "2025-07-14", "taskid": "E-46/25071013(973)", "desc": "-", "status": "Completed", "remarks": "Submitted, 32,220.00" },
    { "id": "t1721996832030", "date": "2025-07-14", "taskid": "E-46/25071014(974)", "desc": "-", "status": "Completed", "remarks": "Submitted, 141,900.00" },
    { "id": "t1721996832031", "date": "2025-07-13", "taskid": "765/25071307(976)", "desc": "-", "status": "Completed", "remarks": "Submitted c/o BM Saed - Maintenance Services,", "completionDate": "2025-07-14" },
    { "id": "t1721996832032", "date": "2025-07-13", "taskid": "430 25071311 (980)", "desc": "-", "status": "Completed", "remarks": "Submitted c/o BM Saed, 17,480.00", "completionDate": "2025-07-14" },
    { "id": "t1721996832033", "date": "2025-07-13", "taskid": "F-57/25071321 (898)", "desc": "-", "status": "Completed", "remarks": "Submitted (Sales), 7,690.63", "completionDate": "2025-07-14" },
    { "id": "t1721996832034", "date": "2025-07-14", "taskid": "F-57/25071328(997)", "desc": "-", "status": "Completed", "remarks": "Submitted (Sales), 14,572.80", "completionDate": "2025-07-14" },
    { "id": "t1721996832035", "date": "2025-07-14", "taskid": "H-75/25071312 (981)", "desc": "-", "status": "Completed", "remarks": "Submitted, 16,767.00", "completionDate": "2025-07-14" },
    { "id": "t1721996832036", "date": "2025-07-14", "taskid": "696 / 25071309 (978)", "desc": "-", "status": "Completed", "remarks": "Submitted, 12,690.00", "completionDate": "2025-07-14" },
    { "id": "t1721996832037", "date": "2025-07-14", "taskid": "Q-169 / 25070910 (963)", "desc": "-", "status": "Completed", "remarks": "Submitted, 9,591.00", "completionDate": "2025-07-14" },
    { "id": "t1721996832038", "date": "2025-07-14", "taskid": "1059/25071306(975)", "desc": "-", "status": "Completed", "remarks": "Submitted, 4,549.40", "completionDate": "2025-07-14" },
    { "id": "t1721996832039", "date": "2025-07-14", "taskid": "799/25071421(1015)", "desc": "-", "status": "Completed", "remarks": "Sales Bilal, Submitted, 5,600.00", "completionDate": "2025-07-14" },
    { "id": "t1721996832040", "date": "2025-07-14", "taskid": "E-49/25071006 (966)", "desc": "-", "status": "Completed", "remarks": "Submitted, 504,328,672.80", "completionDate": "2025-07-14" },
    { "id": "t1721996832041", "date": "2025-07-13", "taskid": "E-49 25070721 (948)", "desc": "-", "status": "Completed", "remarks": "Submitted 174,800", "completionDate": "2025-07-13" },
    { "id": "t1721996832042", "date": "2025-07-09", "taskid": "H-75/25070716 (943)", "desc": "-", "status": "Completed", "remarks": "Submitted, 19,178.55", "completionDate": "2025-07-10" },
    { "id": "t1721996832043", "date": "2025-07-08", "taskid": "D-33/25070719(946)", "desc": "-", "status": "Completed", "remarks": "Submitted, 1,690.30", "completionDate": "2025-07-10" },
    { "id": "t1721996832044", "date": "2025-07-09", "taskid": "H-75/25070717 (944)", "desc": "-", "status": "Completed", "remarks": "Submitted, 1,932.00", "completionDate": "2025-07-10" },
    { "id": "t1721996832045", "date": "2025-07-08", "taskid": "F-56 / 25061801 TDR", "desc": "-", "status": "Completed", "remarks": "Submitted, 234,931.20", "completionDate": "2025-07-10" },
    { "id": "t1721996832046", "date": "2025-07-10", "taskid": "1059 25070807 (954)", "desc": "-", "status": "Completed", "remarks": "Submitted, 22,419.25", "completionDate": "2025-07-10" },
    { "id": "t1721996832047", "date": "2025-07-10", "taskid": "H-75/25070718(945)", "desc": "-", "status": "Completed", "remarks": "Submitted, 1,897.50", "completionDate": "2025-07-10" },
    { "id": "t1721996832048", "date": "2025-07-02", "taskid": "L-120 25070208 (911)", "desc": "-", "status": "Completed", "remarks": "Submitted, 760,725.00", "completionDate": "2025-07-08" },
    { "id": "t1721996832049", "date": "2025-07-03", "taskid": "V-215 25062601-TDR", "desc": "-", "status": "Completed", "remarks": "Submitted, 276,582.13", "completionDate": "2025-07-08" },
    { "id": "t1721996832050", "date": "2025-07-06", "taskid": "F-60 25070614 (930)", "desc": "-", "status": "Completed", "remarks": "Submitted c/o Earl, 914.25", "completionDate": "2025-07-08" },
    { "id": "t1721996832051", "date": "2025-07-03", "taskid": "A-6 25062607 (868)", "desc": "-", "status": "Completed", "remarks": "Submitted 225,664.50,", "completionDate": "2025-07-03" },
    { "id": "t1721996832052", "date": "2025-07-03", "taskid": "H-75 25070213 (916)", "desc": "-", "status": "Completed", "remarks": "Submitted 1,012,316.25", "completionDate": "2025-07-07" },
    { "id": "t1721996832053", "date": "2025-07-06", "taskid": "348 25070615 (931)", "desc": "-", "status": "Completed", "remarks": "Submitted C/O Biomed, 89,176.75", "completionDate": "2025-07-07" },
    { "id": "t1721996832054", "date": "2025-07-01", "taskid": "1090 25063008 (895)", "desc": "-", "status": "Completed", "remarks": "Thru Email, 1,251.20", "completionDate": "2025-07-07" },
    { "id": "t1721996832055", "date": "2025-07-07", "taskid": "I-84 25070608 (924)", "desc": "-", "status": "Completed", "remarks": "Revision needed, Submitted 720.00", "completionDate": "2025-07-07" },
    { "id": "t1721996832056", "date": "2025-07-01", "taskid": "P-160 25062614(875)", "desc": "-", "status": "Completed", "remarks": "Submitted c/o Biomed, 340,372.40", "completionDate": "2025-07-03" },
    { "id": "t1721996832057", "date": "2025-07-01", "taskid": "N-131 25062317(849)", "desc": "-", "status": "Completed", "remarks": "Submitted, 141,900.80", "completionDate": "2025-07-03" },
    { "id": "t1721996832058", "date": "2025-07-03", "taskid": "378 25062609 (870)", "desc": "-", "status": "Completed", "remarks": "Submitted c/o Biomed Earl", "completionDate": "2025-07-03" },
    { "id": "t1721996832059", "date": "2025-07-03", "taskid": "E-46 25070307 (918)", "desc": "-", "status": "Completed", "remarks": "Submitted, 7,999.20", "completionDate": "2025-07-03" },
    { "id": "t1721996832060", "date": "2025-07-01", "taskid": "D-38 25070106 (903)", "desc": "-", "status": "Completed", "remarks": "Spare parts Submitted, 4,565.50", "completionDate": "2025-07-02" },
    { "id": "t1721996832061", "date": "2025-07-02", "taskid": "1059 25070111 (908)", "desc": "-", "status": "Completed", "remarks": "Submitted, 7,679.70", "completionDate": "2025-07-02" },
    { "id": "t1721996832062", "date": "2025-07-02", "taskid": "E-46 / 25063013 (900)", "desc": "-", "status": "Completed", "remarks": "Submitted, 9,860.40", "completionDate": "2025-07-02" },
    { "id": "t1721996832063", "date": "2025-07-02", "taskid": "E-46 25063011 (898)", "desc": "-", "status": "Completed", "remarks": "Submitted, 17,250.00", "completionDate": "2025-07-02" },
    { "id": "t1721996832064", "date": "2025-07-02", "taskid": "517 25070107 (904)", "desc": "-", "status": "Completed", "remarks": "Submitted c/o Saed, 30,357.00", "completionDate": "2025-07-02" },
    { "id": "t1721996832065", "date": "2025-07-02", "taskid": "L-120 25070207 (910)", "desc": "-", "status": "Completed", "remarks": "Submitted, 13,800.00", "completionDate": "2025-07-02" },
    { "id": "t1721996832066", "date": "2025-07-02", "taskid": "772 25070211 (914)", "desc": "-", "status": "Completed", "remarks": "Submitted Via Email, 547.40", "completionDate": "2025-07-02" },
    { "id": "t1721996832067", "date": "2025-07-02", "taskid": "D-33 25070212 (915)", "desc": "-", "status": "Completed", "remarks": "Submitted Via Email, 26,200.00", "completionDate": "2025-07-02" },
    { "id": "t1721996832068", "date": "2025-07-01", "taskid": "Q-167 25062612(873)", "desc": "-", "status": "Completed", "remarks": "Submitted 46419.75", "completionDate": "2025-07-01" },
    { "id": "t1721996832069", "date": "2025-07-01", "taskid": "A-7 25062511(865)", "desc": "-", "status": "Completed", "remarks": "Submitted 1068.00", "completionDate": "2025-07-01" },
    { "id": "t1721996832070", "date": "2025-07-01", "taskid": "1091 25063009 (896)", "desc": "-", "status": "Completed", "remarks": "Submitted Thru Email, 337,755.00", "completionDate": "2025-07-01" },
    { "id": "t1721996832071", "date": "2025-07-01", "dueDate": "2025-07-01", "taskid": "L-120 25062911(881)", "desc": "-", "status": "Completed", "remarks": "Submitted 207,000.00", "completionDate": "2025-07-01" },
    { "id": "t1753594427791", "status": "Completed", "date": "2025-07-27", "dueDate": "2025-07-28", "taskid": "1059/25072412(1079)", "bidOrigin": "ETIMAD", "desc": "", "remarks": "--- Completion Remarks ---22,419.25", "subStatus": "", "importance": "High", "completionDate": "2025-07-27" },
    { "id": "t1753594853455", "status": "Completed", "date": "2025-07-27", "dueDate": "2025-07-27", "taskid": "E-49/25072309(1064)", "bidOrigin": "NUPCO", "desc": "", "remarks": "--- Completion Remarks ---7,344.00", "subStatus": "", "importance": "High", "completionDate": "2025-07-27" },
    { "status": "Completed", "date": "2025-07-08", "dueDate": "", "taskid": "-", "desc": "Submitted, 234,931.20", "remarks": "7/10/2025", "subStatus": "", "importance": "", "completionDate": "", "id": "t1753622071686_-3714500001749737617" },
    { "status": "Completed", "date": "2025-07-03", "dueDate": "", "taskid": "-", "desc": "Submitted, 276,582.13", "remarks": "7/8/2025", "subStatus": "", "importance": "", "completionDate": "", "id": "t1753622071686_-3714500001749737617" },
    { "status": "Completed", "date": "2025-07-17", "dueDate": "", "taskid": "-", "desc": "25185", "remarks": "45855", "subStatus": "", "importance": "", "completionDate": "", "id": "t1753622071686_-3714500001749737617" },
    { "status": "Completed", "date": "2025-07-17", "dueDate": "", "taskid": "-", "desc": "2735.85", "remarks": "45855", "subStatus": "", "importance": "", "completionDate": "", "id": "t1753622071686_-3714500001749737617" },
    { "status": "Completed", "date": "2025-07-17", "dueDate": "", "taskid": "-", "desc": "Submitted", "remarks": "45855", "subStatus": "", "importance": "", "completionDate": "", "id": "t1753622071686_-3714500001749737617" },
    { "status": "Completed", "date": "2025-07-17", "dueDate": "", "taskid": "-", "desc": "23460", "remarks": "45855", "subStatus": "", "importance": "", "completionDate": "", "id": "t1753622071686_-3714500001749737617" },
    { "status": "Completed", "date": "2025-07-17", "dueDate": "", "taskid": "-", "desc": "Submitted", "remarks": "45855", "subStatus": "", "importance": "", "completionDate": "", "id": "t1753622071686_-3714500001749737617" },
    { "status": "Completed", "date": "2025-07-17", "dueDate": "", "taskid": "-", "desc": "322356.5", "remarks": "45855", "subStatus": "", "importance": "", "completionDate": "", "id": "t1753622071686_-3714500001749737617" },
    { "status": "Completed", "date": "2025-07-17", "dueDate": "", "taskid": "-", "desc": "17250", "remarks": "45855", "subStatus": "", "importance": "", "completionDate": "", "id": "t1753622071686_-3714500001749737617" },
    { "status": "Completed", "date": "2025-07-17", "dueDate": "", "taskid": "-", "desc": "41400", "remarks": "45855", "subStatus": "", "importance": "", "completionDate": "", "id": "t1753622071686_-3714500001749737617" },
    { "status": "Completed", "date": "2025-07-17", "dueDate": "", "taskid": "-", "desc": "287385", "remarks": "45855", "subStatus": "", "importance": "", "completionDate": "", "id": "t1753622071686_-3714500001749737617" },
    { "status": "Completed", "date": "2025-07-17", "dueDate": "", "taskid": "-", "desc": "5336", "remarks": "45855", "subStatus": "", "importance": "", "completionDate": "", "id": "t1753622071686_-3714500001749737617" },
    { "status": "Completed", "date": "2025-07-17", "dueDate": "", "taskid": "-", "desc": "218373.5", "remarks": "45855", "subStatus": "", "importance": "", "completionDate": "", "id": "t1753622071686_-3714500001749737617" },
    { "status": "Completed", "date": "2025-07-17", "dueDate": "", "taskid": "-", "desc": "1320", "remarks": "45859", "subStatus": "", "importance": "", "completionDate": "", "id": "t1753622071686_-3714500001749737617" },
    { "status": "Completed", "date": "2025-07-20", "dueDate": "", "taskid": "-", "desc": "0", "remarks": "45860", "subStatus": "", "importance": "", "completionDate": "", "id": "t1753622071686_-3714500001749737617" },
    { "status": "Completed", "date": "2025-07-20", "dueDate": "", "taskid": "-", "desc": "390", "remarks": "45859", "subStatus": "", "importance": "", "completionDate": "", "id": "t1753622071686_-3714500001749737617" },
    { "status": "Completed", "date": "2025-07-20", "dueDate": "", "taskid": "-", "desc": "No Bid", "remarks": "45860", "subStatus": "", "importance": "", "completionDate": "", "id": "t1753622071686_-3714500001749737617" },
    { "status": "Completed", "date": "2025-07-20", "dueDate": "", "taskid": "-", "desc": "Drafting", "remarks": "45858", "subStatus": "", "importance": "", "completionDate": "", "id": "t1753622071686_-3714500001749737617" },
    { "status": "Completed", "date": "2025-07-21", "dueDate": "", "taskid": "-", "desc": "0", "remarks": "45859", "subStatus": "", "importance": "", "completionDate": "", "id": "t1753622071686_-3714500001749737617" },
    { "status": "Completed", "date": "2025-07-22", "dueDate": "", "taskid": "-", "desc": "0", "remarks": "45860", "subStatus": "", "importance": "", "completionDate": "", "id": "t1753622071686_-3714500001749737617" },
    { "status": "Completed", "date": "2025-07-23", "dueDate": "", "taskid": "-", "desc": "24143.1", "remarks": "45861", "subStatus": "", "importance": "", "completionDate": "", "id": "t1753622071686_-3714500001749737617" },
    { "status": "Completed", "date": "2025-07-23", "dueDate": "", "taskid": "-", "desc": "30226.56", "remarks": "45861", "subStatus": "", "importance": "", "completionDate": "", "id": "t1753622071686_-3714500001749737617" },
    { "status": "Completed", "date": "2025-07-23", "dueDate": "", "taskid": "-", "desc": "0", "remarks": "45861", "subStatus": "", "importance": "", "completionDate": "", "id": "t1753622071686_-3714500001749737617" },
    { "status": "Completed", "date": "2025-07-23", "dueDate": "", "taskid": "-", "desc": "2384", "remarks": "45862", "subStatus": "", "importance": "", "completionDate": "", "id": "t1753622071686_-3714500001749737617" },
    { "status": "Completed", "date": "2025-07-23", "dueDate": "", "taskid": "-", "desc": "22209.72", "remarks": "45862", "subStatus": "", "importance": "", "completionDate": "", "id": "t1753622071686_-3714500001749737617" },
    { "status": "Completed", "date": "2025-07-23", "dueDate": "", "taskid": "-", "desc": "9,200.00C/O Saed, Spareparts", "remarks": "45861", "subStatus": "", "importance": "", "completionDate": "", "id": "t1753622071686_-3714500001749737617" },
    { "status": "Completed", "date": "2025-07-23", "dueDate": "", "taskid": "-", "desc": "57,071.05", "remarks": "C/O Saed", "subStatus": "45861", "importance": "", "completionDate": "", "id": "t1753622071686_-3714500001749737617" },
    { "status": "Completed", "date": "2025-07-23", "dueDate": "", "taskid": "-", "desc": "No Bid", "remarks": "45861", "subStatus": "", "importance": "", "completionDate": "", "id": "t1753622071686_-3714500001749737617" },
    { "status": "Completed", "date": "2025-07-23", "dueDate": "", "taskid": "-", "desc": "0", "remarks": "45861", "subStatus": "", "importance": "", "completionDate": "", "id": "t1753622071686_-3714500001749737617" },
    { "status": "Completed", "date": "2025-07-23", "dueDate": "", "taskid": "-", "desc": "808995", "remarks": "45862", "subStatus": "", "importance": "", "completionDate": "", "id": "t1753622071686_-3714500001749737617" },
    { "status": "Completed", "date": "2025-07-24", "dueDate": "", "taskid": "-", "desc": "152,363.50 c/o earl", "remarks": "45862", "subStatus": "", "importance": "", "completionDate": "", "id": "t1753622071686_-3714500001749737617" },
    { "status": "Completed", "date": "2025-07-24", "dueDate": "", "taskid": "-", "desc": "27347", "remarks": "45862", "subStatus": "", "importance": "", "completionDate": "", "id": "t1753622071686_-3714500001749737617" },
    { "status": "Completed", "date": "2025-07-24", "dueDate": "", "taskid": "-", "desc": "Submitted", "remarks": "45862", "subStatus": "", "importance": "", "completionDate": "", "id": "t1753622071686_-3714500001749737617" },
    { "id": "t1753679845585", "status": "Completed", "date": "2025-07-28", "dueDate": "2025-07-30", "taskid": "E-49/25072312(1067)", "bidOrigin": "NUPCO", "desc": "", "remarks": "\n\n--- Completion Remarks ---\n1,046,108.12", "subStatus": "-", "importance": "High", "completionDate": "2025-07-30" },
    { "id": "t1753704387617", "status": "Completed", "date": "2025-07-28", "dueDate": "2025-08-05", "taskid": "H-75/25072812 (1092)", "bidOrigin": "E-Purchasing", "desc": "", "remarks": "\n\n--- Completion Remarks ---\n21,840.00", "subStatus": "", "importance": "Low", "completionDate": "2025-07-28" },
    { "id": "t1753704509656", "status": "Completed", "date": "2025-07-28", "dueDate": "2025-07-29", "taskid": "732/25072807 (1087)", "bidOrigin": "", "desc": "", "remarks": "\n\n--- Completion Remarks ---\nSubmitted VIA Email: <s-athkham@sst-sa.com> 2,740.45", "subStatus": "-", "importance": "Low", "completionDate": "2025-07-29" },
    { "id": "t1753704532848", "status": "Completed", "date": "2025-07-28", "dueDate": "2025-07-29", "taskid": "1094/25072808 (1088)", "bidOrigin": "", "desc": "", "remarks": "\n\n--- Completion Remarks ---\nSent Via Email at lucenelm@naizak.com 09:40am\n3,763.26", "subStatus": "-", "importance": "Low", "completionDate": "2025-07-29" },
    { "id": "t1753704560405", "status": "Completed", "date": "2025-07-28", "dueDate": "2025-08-03", "taskid": "H-75/25072809 (1089)", "bidOrigin": "E-Purchasing", "desc": "", "remarks": "\n\n--- Completion Remarks ---\n10,080.00", "subStatus": "-", "importance": "Low", "completionDate": "2025-07-29" },
    { "id": "t1753704582444", "status": "Not Started", "date": "2025-07-28", "dueDate": "2025-07-30", "taskid": "849/25072810 (1090)", "bidOrigin": "", "desc": "", "remarks": "", "subStatus": "", "importance": "Low", "completionDate": null },
    { "id": "t1753704610849", "status": "Completed", "date": "2025-07-28", "dueDate": "2025-08-05", "taskid": "H-75/25072811 (1091)", "bidOrigin": "E-Purchasing", "desc": "", "remarks": "\n\n--- Completion Remarks ---\n17,560.50", "subStatus": "For Payment", "importance": "Low", "completionDate": "2025-07-29" },
    { "id": "t1753767857628", "status": "Approved for Submission", "date": "2025-07-29", "dueDate": "2025-07-30", "taskid": "I-88/25072707(1081)", "bidOrigin": "", "desc": "", "remarks": "", "subStatus": "", "importance": "Low", "completionDate": null },
    { "id": "t1753767906079", "status": "Completed", "date": "2025-07-29", "dueDate": "2025-07-29", "taskid": "E-49/25072313(1069)", "bidOrigin": "NUPCO", "desc": "", "remarks": "\n\n--- Completion Remarks ---\n335,208.90", "subStatus": null, "importance": "High", "completionDate": "2025-07-29" },
    { "id": "t1753789258815", "status": "Completed", "date": "2025-07-29", "dueDate": "2025-07-30", "taskid": "Q-169/25072908(1095)", "bidOrigin": "ETIMAD", "desc": "", "remarks": "\n\n--- Completion Remarks ---\n59,400.00", "subStatus": "For Payment", "importance": "High", "completionDate": "2025-07-30" },
    { "id": "t1753790286339", "status": "Completed", "date": "2025-07-29", "dueDate": "2025-08-01", "taskid": "Q-169/25072906(1093)", "bidOrigin": "ETIMAD", "desc": "", "remarks": "\n\n--- Completion Remarks ---\n8,400.00", "subStatus": "For Payment", "importance": "Low", "completionDate": "2025-07-29" },
    { "id": "t1753793275375", "status": "Completed", "date": "2025-07-29", "dueDate": "2025-07-30", "taskid": "Q-169/25072711(1085)", "bidOrigin": "ETIMAD", "desc": "", "remarks": "\n\n--- Completion Remarks ---\n5,340.00", "subStatus": "For Payment", "importance": "High", "completionDate": "2025-07-29" },
    { "id": "t1753793584615", "status": "Approved for Submission", "date": "2025-07-29", "dueDate": "2025-07-30", "taskid": "977/25072910(1097)", "bidOrigin": "SALES", "desc": "", "remarks": "", "subStatus": "On Tray", "importance": "Medium", "completionDate": null },
    { "id": "t1753854717712", "status": "Approved for Submission", "date": "2025-07-30", "dueDate": "2025-08-03", "taskid": "E-49/25072806(1086)", "bidOrigin": "NUPCO", "desc": "", "remarks": "", "subStatus": "For Payment", "importance": "Medium", "completionDate": null },
    { "id": "t1753854750167", "status": "Completed", "date": "2025-07-30", "dueDate": "2025-07-31", "taskid": "H-75/25072407(1074)", "bidOrigin": "E-Purchasing", "desc": "", "remarks": "\n\n--- Completion Remarks ---\n15,779.61", "subStatus": "On Tray", "importance": "High", "completionDate": "2025-07-31" },
    { "id": "t1753854808872", "status": "Completed", "date": "2025-07-30", "dueDate": "2025-08-03", "taskid": "D-33/25071407(1001)", "bidOrigin": "SALES", "desc": "", "remarks": "\n\n--- Completion Remarks ---\n28,326.80", "subStatus": "On Tray", "importance": "Low", "completionDate": "2025-07-31" },
    { "id": "t1753874810396", "status": "For Review", "date": "2025-07-30", "dueDate": "2025-07-31", "taskid": "377/25073006(1098)", "bidOrigin": "Engineering", "desc": "", "remarks": "", "subStatus": "With Earl", "importance": "Low", "completionDate": null }
  ]
};

function transformData(data: any) {
  const newSettings: AppSettings = {
    workflowCategories: data.settings.statuses.map((s: any): WorkflowCategory => ({
      id: uuidv4(),
      name: s.name,
      color: s.background,
    })),
    subCategories: data.settings.subStatuses.map((ss: any): SubCategory => ({
      id: uuidv4(),
      name: ss.name,
      parentCategory: ss.parent,
      color: ss.color,
    })),
    importanceLevels: data.settings.importanceLevels.map((il: any): ImportanceLevel => ({
      id: uuidv4(),
      name: il.name,
      color: il.color,
    })),
    bidOrigins: data.settings.bidOrigins.map((bo: any): BidOrigin => ({
      id: uuidv4(),
      name: bo.name,
    })),
  };
  
  if (!newSettings.workflowCategories.find(cat => cat.name.toLowerCase() === 'completed')) {
      newSettings.workflowCategories.push({
          id: uuidv4(),
          name: 'Completed',
          color: '#22C55E'
      });
  }

  const newTasks: Task[] = data.tasks.map((t: any): Task => {
    // Find a matching workflow category, defaulting to the first one if not found.
    let status = t.status || '';
    const categoryExists = newSettings.workflowCategories.some(cat => cat.name === status);
    if (!status || !categoryExists) {
      status = newSettings.workflowCategories[0]?.name || 'Not Started';
    }

    return {
      id: t.id || uuidv4(),
      taskid: t.taskid || '',
      title: t.desc || t.taskid || 'Untitled Task',
      date: t.date ? new Date(t.date).toISOString() : new Date().toISOString(),
      dueDate: t.dueDate ? new Date(t.dueDate).toISOString() : new Date().toISOString(),
      status: status,
      subStatus: t.subStatus || '',
      importance: t.importance || newSettings.importanceLevels[1]?.name || '',
      bidOrigin: t.bidOrigin || '',
      desc: t.desc || '',
      remarks: t.remarks || '',
      completionDate: t.completionDate ? new Date(t.completionDate).toISOString() : undefined,
    }
  });

  return { settings: newSettings, tasks: newTasks };
}


export async function migrateData() {
  const { settings, tasks } = transformData(providedData);

  const batch = writeBatch(db);

  const tasksCollectionRef = collection(db, 'tasks');
  const existingTasksSnapshot = await getDocs(tasksCollectionRef);
  existingTasksSnapshot.forEach(doc => {
    batch.delete(doc.ref);
  });
  
  const settingsDocRef = doc(db, 'settings', 'app-settings');
  batch.set(settingsDocRef, settings);

  tasks.forEach(task => {
    const { id, ...taskData } = task;
    const taskDocRef = doc(tasksCollectionRef, id);
    batch.set(taskDocRef, taskData);
  });

  await batch.commit();
}

    