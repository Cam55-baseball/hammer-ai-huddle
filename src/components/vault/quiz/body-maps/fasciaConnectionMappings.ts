// ═══════════════════════════════════════════════════════════════════════════════
// ELITE FASCIA CONNECTION MAPPINGS
// ═══════════════════════════════════════════════════════════════════════════════
// 
// Based on world-leading fascia research:
// - Thomas Myers (Anatomy Trains: Myofascial Meridians)
// - Dr. Robert Schleip (Fascia Research Congress, Fascia: The Tensional Network)
// - Carla & Antonio Stecco (Fascial Manipulation)
// - Chong Xie (HFT Methodology)
// - International Fascia Research Congress proceedings
//
// This data is for EDUCATIONAL PURPOSES ONLY and does not constitute medical advice.
// ═══════════════════════════════════════════════════════════════════════════════

export interface BodyLine {
  id: string;
  name: string;           // Scientific name
  kidName: string;        // Kid-friendly name
  emoji: string;
  description: string;    // Kid-friendly description
  color: string;          // For visualization
}

export interface BodyConnectionInfo {
  areaId: string;
  primaryLine: BodyLine;
  secondaryLines?: BodyLine[];
  connectedAreas: string[];        // IDs of connected body areas
  kidInsight: string;              // Simple explanation
  proTip: string;                  // What pros check when this hurts
  tcmConnection?: string;          // Traditional Chinese Medicine (educational)
  hftPrinciple?: string;           // HFT methodology insight
  researchSource: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// THE 6 MAIN BODY LINES (Myofascial Meridians from Anatomy Trains)
// ═══════════════════════════════════════════════════════════════════════════════

export const BODY_LINES: Record<string, BodyLine> = {
  SBL: {
    id: 'SBL',
    name: 'Superficial Back Line',
    kidName: 'Back Track',
    emoji: '🚂',
    description: 'Runs from your heels, up the back of your legs, up your spine, and over your head to your eyebrows! Like a train track on your back.',
    color: '#3B82F6', // blue
  },
  SFL: {
    id: 'SFL',
    name: 'Superficial Front Line',
    kidName: 'Front Track',
    emoji: '🚃',
    description: 'Runs from your toes, up the front of your legs, up your belly, and to your throat. The front of your body suit!',
    color: '#22C55E', // green
  },
  LL: {
    id: 'LL',
    name: 'Lateral Line',
    kidName: 'Side Track',
    emoji: '🚋',
    description: 'Runs from your ankle, up the side of your leg and body, to the side of your neck. Like train tracks on each side!',
    color: '#A855F7', // purple
  },
  SPL: {
    id: 'SPL',
    name: 'Spiral Line',
    kidName: 'Twist Track',
    emoji: '🌀',
    description: 'Wraps around your body like a candy cane stripe! It connects your opposite hip to your shoulder.',
    color: '#F59E0B', // amber
  },
  DFL: {
    id: 'DFL',
    name: 'Deep Front Line',
    kidName: 'Core Track',
    emoji: '🎯',
    description: 'Hidden deep inside, connecting your feet to your breathing muscle (diaphragm) to your jaw. Your secret power line!',
    color: '#EF4444', // red
  },
  ARM: {
    id: 'ARM',
    name: 'Arm Lines',
    kidName: 'Arm Tracks',
    emoji: '🚞',
    description: 'Connect your shoulders to your fingertips! There are 4 arm tracks - front/back and deep/shallow.',
    color: '#F97316', // orange
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPREHENSIVE BODY AREA FASCIA MAPPINGS (60+ zones)
// ═══════════════════════════════════════════════════════════════════════════════

export const FASCIA_CONNECTIONS: Record<string, BodyConnectionInfo> = {
  // ═══════════════════════════════════════════════════════════════════════════════
  // HEAD & NECK (FRONT VIEW)
  // ═══════════════════════════════════════════════════════════════════════════════
  head_front: {
    areaId: 'head_front',
    primaryLine: BODY_LINES.SFL,
    connectedAreas: ['neck_front', 'sternum', 'upper_abs'],
    kidInsight: 'Your forehead connects all the way down to your belly through the Front Track!',
    proTip: 'Jaw tension often relates to neck and chest tightness. Elite athletes check their breathing patterns.',
    tcmConnection: 'Stomach Meridian (ST) - connects to digestion and grounding',
    hftPrinciple: 'Anterior chain balance - check diaphragm breathing',
    researchSource: 'Myers, Anatomy Trains (SFL)',
  },
  neck_front: {
    areaId: 'neck_front',
    primaryLine: BODY_LINES.SFL,
    secondaryLines: [BODY_LINES.DFL],
    connectedAreas: ['head_front', 'sternum', 'left_chest', 'right_chest'],
    kidInsight: 'Your throat connects down to your chest and stomach - thats why hunching over can make breathing hard!',
    proTip: 'Front neck tension often comes from screen time posture. Check jaw, chest, and hip flexors.',
    tcmConnection: 'Stomach (ST) & Conception Vessel (CV) - emotional expression',
    hftPrinciple: 'Jaw-diaphragm-pelvic floor connection',
    researchSource: 'Myers, Anatomy Trains (SFL, DFL)',
  },
  neck_back: {
    areaId: 'neck_back',
    primaryLine: BODY_LINES.SBL,
    connectedAreas: ['head_back', 'left_upper_back', 'right_upper_back', 'lower_back_center'],
    kidInsight: 'Your neck is like the top of a chain that goes all the way down to your heels!',
    proTip: 'Neck stiffness? Elite athletes check their hamstrings and calves first.',
    tcmConnection: 'Bladder Meridian (BL) - longest meridian, stress accumulation',
    hftPrinciple: 'Posterior chain continuity - tension travels up from feet',
    researchSource: 'Myers, Anatomy Trains (SBL)',
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // SHOULDERS & UPPER BODY
  // ═══════════════════════════════════════════════════════════════════════════════
  left_shoulder_front: {
    areaId: 'left_shoulder_front',
    primaryLine: BODY_LINES.ARM,
    secondaryLines: [BODY_LINES.SPL],
    connectedAreas: ['left_chest', 'left_bicep', 'neck_front', 'right_hip_flexor'],
    kidInsight: 'Your shoulder connects to your arm AND wraps around to your opposite hip like a seatbelt!',
    proTip: 'Shoulder pain? Pros check the opposite hip and same-side chest.',
    tcmConnection: 'Lung (LU) & Large Intestine (LI) - arm meridians',
    hftPrinciple: 'Spiral sling - contralateral force transmission',
    researchSource: 'Myers, Anatomy Trains (Arm Lines, SPL)',
  },
  right_shoulder_front: {
    areaId: 'right_shoulder_front',
    primaryLine: BODY_LINES.ARM,
    secondaryLines: [BODY_LINES.SPL],
    connectedAreas: ['right_chest', 'right_bicep', 'neck_front', 'left_hip_flexor'],
    kidInsight: 'Your shoulder connects to your arm AND wraps around to your opposite hip like a seatbelt!',
    proTip: 'Shoulder pain? Pros check the opposite hip and same-side chest.',
    tcmConnection: 'Lung (LU) & Large Intestine (LI) - arm meridians',
    hftPrinciple: 'Spiral sling - contralateral force transmission',
    researchSource: 'Myers, Anatomy Trains (Arm Lines, SPL)',
  },
  left_shoulder_back: {
    areaId: 'left_shoulder_back',
    primaryLine: BODY_LINES.ARM,
    secondaryLines: [BODY_LINES.SBL],
    connectedAreas: ['left_upper_back', 'left_tricep', 'neck_back', 'left_lat'],
    kidInsight: 'The back of your shoulder connects down through your arm to your pinky finger!',
    proTip: 'Rear shoulder tightness often relates to lat and upper back restriction.',
    tcmConnection: 'Small Intestine (SI) & Triple Burner (TB)',
    hftPrinciple: 'Posterior arm chain - affects throwing mechanics',
    researchSource: 'Myers, Anatomy Trains (Deep Back Arm Line)',
  },
  right_shoulder_back: {
    areaId: 'right_shoulder_back',
    primaryLine: BODY_LINES.ARM,
    secondaryLines: [BODY_LINES.SBL],
    connectedAreas: ['right_upper_back', 'right_tricep', 'neck_back', 'right_lat'],
    kidInsight: 'The back of your shoulder connects down through your arm to your pinky finger!',
    proTip: 'Rear shoulder tightness often relates to lat and upper back restriction.',
    tcmConnection: 'Small Intestine (SI) & Triple Burner (TB)',
    hftPrinciple: 'Posterior arm chain - affects throwing mechanics',
    researchSource: 'Myers, Anatomy Trains (Deep Back Arm Line)',
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // CHEST & TORSO
  // ═══════════════════════════════════════════════════════════════════════════════
  left_chest: {
    areaId: 'left_chest',
    primaryLine: BODY_LINES.SFL,
    secondaryLines: [BODY_LINES.ARM],
    connectedAreas: ['neck_front', 'left_shoulder_front', 'sternum', 'upper_abs'],
    kidInsight: 'Your chest muscles connect up to your neck and down to your belly button!',
    proTip: 'Tight chest often causes shoulder problems. Stretch your pecs to help your shoulders.',
    tcmConnection: 'Lung (LU) - breathing and letting go',
    hftPrinciple: 'Anterior shoulder loading - breathing capacity',
    researchSource: 'Myers, Anatomy Trains (SFL, SFAL)',
  },
  right_chest: {
    areaId: 'right_chest',
    primaryLine: BODY_LINES.SFL,
    secondaryLines: [BODY_LINES.ARM],
    connectedAreas: ['neck_front', 'right_shoulder_front', 'sternum', 'upper_abs'],
    kidInsight: 'Your chest muscles connect up to your neck and down to your belly button!',
    proTip: 'Tight chest often causes shoulder problems. Stretch your pecs to help your shoulders.',
    tcmConnection: 'Lung (LU) - breathing and letting go',
    hftPrinciple: 'Anterior shoulder loading - breathing capacity',
    researchSource: 'Myers, Anatomy Trains (SFL, SFAL)',
  },
  sternum: {
    areaId: 'sternum',
    primaryLine: BODY_LINES.SFL,
    secondaryLines: [BODY_LINES.DFL],
    connectedAreas: ['neck_front', 'left_chest', 'right_chest', 'upper_abs'],
    kidInsight: 'Your breastbone is like a bridge connecting your ribs and your breathing muscle!',
    proTip: 'Sternum tension often indicates shallow breathing patterns. Work on diaphragmatic breathing.',
    tcmConnection: 'Conception Vessel (CV) - emotional center',
    hftPrinciple: 'Core integration point - breathing anchor',
    researchSource: 'Myers, Anatomy Trains (SFL)',
  },
  upper_abs: {
    areaId: 'upper_abs',
    primaryLine: BODY_LINES.SFL,
    connectedAreas: ['sternum', 'lower_abs', 'left_chest', 'right_chest'],
    kidInsight: 'Your upper belly connects up to your chest and down to your hips - its part of your core!',
    proTip: 'Upper ab tension can affect breathing. Ensure you can breathe into your belly, not just chest.',
    tcmConnection: 'Stomach (ST) & Spleen (SP)',
    hftPrinciple: 'Anterior core chain - stabilization',
    researchSource: 'Myers, Anatomy Trains (SFL)',
  },
  lower_abs: {
    areaId: 'lower_abs',
    primaryLine: BODY_LINES.SFL,
    secondaryLines: [BODY_LINES.DFL],
    connectedAreas: ['upper_abs', 'left_hip_flexor', 'right_hip_flexor', 'left_groin', 'right_groin'],
    kidInsight: 'Your lower belly is the power center that connects to your legs!',
    proTip: 'Lower ab weakness often leads to hip flexor overwork. Train your deep core, not just six-pack.',
    tcmConnection: 'Kidney (KI) & Bladder (BL)',
    hftPrinciple: 'Pelvic floor integration - power transfer zone',
    researchSource: 'Myers, Anatomy Trains (SFL, DFL)',
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // BACK
  // ═══════════════════════════════════════════════════════════════════════════════
  left_upper_back: {
    areaId: 'left_upper_back',
    primaryLine: BODY_LINES.SBL,
    secondaryLines: [BODY_LINES.SPL],
    connectedAreas: ['neck_back', 'left_shoulder_back', 'left_lat', 'lower_back_left'],
    kidInsight: 'Your upper back is like a bridge between your neck and lower back!',
    proTip: 'Upper back stiffness? Check your thoracic spine rotation and lat flexibility.',
    tcmConnection: 'Bladder (BL) - upper back branch',
    hftPrinciple: 'Scapular force transmission',
    researchSource: 'Myers, Anatomy Trains (SBL)',
  },
  right_upper_back: {
    areaId: 'right_upper_back',
    primaryLine: BODY_LINES.SBL,
    secondaryLines: [BODY_LINES.SPL],
    connectedAreas: ['neck_back', 'right_shoulder_back', 'right_lat', 'lower_back_right'],
    kidInsight: 'Your upper back is like a bridge between your neck and lower back!',
    proTip: 'Upper back stiffness? Check your thoracic spine rotation and lat flexibility.',
    tcmConnection: 'Bladder (BL) - upper back branch',
    hftPrinciple: 'Scapular force transmission',
    researchSource: 'Myers, Anatomy Trains (SBL)',
  },
  left_lat: {
    areaId: 'left_lat',
    primaryLine: BODY_LINES.ARM,
    secondaryLines: [BODY_LINES.SPL],
    connectedAreas: ['left_shoulder_back', 'left_upper_back', 'lower_back_left', 'right_glute'],
    kidInsight: 'Your lat muscle under your armpit connects all the way to your opposite butt cheek!',
    proTip: 'Tight lats? This affects overhead mobility AND rotational power. Check opposite glute too.',
    tcmConnection: 'Gallbladder (GB) pathway',
    hftPrinciple: 'Posterior oblique sling - throwing/rotational power',
    researchSource: 'Myers, Anatomy Trains (Functional Lines)',
  },
  right_lat: {
    areaId: 'right_lat',
    primaryLine: BODY_LINES.ARM,
    secondaryLines: [BODY_LINES.SPL],
    connectedAreas: ['right_shoulder_back', 'right_upper_back', 'lower_back_right', 'left_glute'],
    kidInsight: 'Your lat muscle under your armpit connects all the way to your opposite butt cheek!',
    proTip: 'Tight lats? This affects overhead mobility AND rotational power. Check opposite glute too.',
    tcmConnection: 'Gallbladder (GB) pathway',
    hftPrinciple: 'Posterior oblique sling - throwing/rotational power',
    researchSource: 'Myers, Anatomy Trains (Functional Lines)',
  },
  lower_back_center: {
    areaId: 'lower_back_center',
    primaryLine: BODY_LINES.SBL,
    secondaryLines: [BODY_LINES.DFL],
    connectedAreas: ['lower_back_left', 'lower_back_right', 'left_glute', 'right_glute', 'left_hamstring_inner', 'right_hamstring_inner'],
    kidInsight: 'Low back pain? The answer might be in your hamstrings or calves! Theyre all connected by the Back Track.',
    proTip: 'Lower back issues almost always involve hamstrings AND hip flexors. Check both.',
    tcmConnection: 'Bladder (BL) & Governing Vessel (GV) - spine energy',
    hftPrinciple: 'Lumbar-pelvic force couple - the crossroads',
    researchSource: 'Myers, Anatomy Trains (SBL, DFL)',
  },
  lower_back_left: {
    areaId: 'lower_back_left',
    primaryLine: BODY_LINES.SBL,
    secondaryLines: [BODY_LINES.LL],
    connectedAreas: ['lower_back_center', 'left_glute', 'left_oblique', 'left_hamstring_outer'],
    kidInsight: 'Your lower back on the left side connects to your left butt and the side of your body!',
    proTip: 'One-sided low back pain? Check the same-side glute, QL, and lateral chain.',
    tcmConnection: 'Bladder (BL) - unilateral tension',
    hftPrinciple: 'Lateral stability chain - single-leg support',
    researchSource: 'Myers, Anatomy Trains (SBL, LL)',
  },
  lower_back_right: {
    areaId: 'lower_back_right',
    primaryLine: BODY_LINES.SBL,
    secondaryLines: [BODY_LINES.LL],
    connectedAreas: ['lower_back_center', 'right_glute', 'right_oblique', 'right_hamstring_outer'],
    kidInsight: 'Your lower back on the right side connects to your right butt and the side of your body!',
    proTip: 'One-sided low back pain? Check the same-side glute, QL, and lateral chain.',
    tcmConnection: 'Bladder (BL) - unilateral tension',
    hftPrinciple: 'Lateral stability chain - single-leg support',
    researchSource: 'Myers, Anatomy Trains (SBL, LL)',
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // ARMS
  // ═══════════════════════════════════════════════════════════════════════════════
  left_bicep: {
    areaId: 'left_bicep',
    primaryLine: BODY_LINES.ARM,
    connectedAreas: ['left_shoulder_front', 'left_elbow_inner', 'left_forearm_front'],
    kidInsight: 'Your bicep is part of a chain from your chest to your thumb!',
    proTip: 'Bicep issues often relate to shoulder positioning. Check chest and anterior shoulder.',
    tcmConnection: 'Lung (LU) - front arm pathway',
    hftPrinciple: 'Superficial front arm line',
    researchSource: 'Myers, Anatomy Trains (SFAL)',
  },
  right_bicep: {
    areaId: 'right_bicep',
    primaryLine: BODY_LINES.ARM,
    connectedAreas: ['right_shoulder_front', 'right_elbow_inner', 'right_forearm_front'],
    kidInsight: 'Your bicep is part of a chain from your chest to your thumb!',
    proTip: 'Bicep issues often relate to shoulder positioning. Check chest and anterior shoulder.',
    tcmConnection: 'Lung (LU) - front arm pathway',
    hftPrinciple: 'Superficial front arm line',
    researchSource: 'Myers, Anatomy Trains (SFAL)',
  },
  left_tricep: {
    areaId: 'left_tricep',
    primaryLine: BODY_LINES.ARM,
    connectedAreas: ['left_shoulder_back', 'left_elbow_outer', 'left_forearm_back'],
    kidInsight: 'Your tricep connects from your shoulder blade down to your pinky side!',
    proTip: 'Tricep tension affects elbow extension. Check lat and rhomboid mobility.',
    tcmConnection: 'Small Intestine (SI) - back arm pathway',
    hftPrinciple: 'Deep back arm line',
    researchSource: 'Myers, Anatomy Trains (DBAL)',
  },
  right_tricep: {
    areaId: 'right_tricep',
    primaryLine: BODY_LINES.ARM,
    connectedAreas: ['right_shoulder_back', 'right_elbow_outer', 'right_forearm_back'],
    kidInsight: 'Your tricep connects from your shoulder blade down to your pinky side!',
    proTip: 'Tricep tension affects elbow extension. Check lat and rhomboid mobility.',
    tcmConnection: 'Small Intestine (SI) - back arm pathway',
    hftPrinciple: 'Deep back arm line',
    researchSource: 'Myers, Anatomy Trains (DBAL)',
  },
  left_elbow_inner: {
    areaId: 'left_elbow_inner',
    primaryLine: BODY_LINES.ARM,
    connectedAreas: ['left_bicep', 'left_forearm_front', 'left_wrist_front'],
    kidInsight: 'Your inner elbow is a meeting point for muscles from your shoulder and fingers!',
    proTip: 'Inner elbow pain (golfers elbow)? Check wrist flexor strength and grip patterns.',
    tcmConnection: 'Heart (HT) & Pericardium (PC)',
    hftPrinciple: 'Medial elbow stress - gripping patterns',
    researchSource: 'Myers, Anatomy Trains (DFAL)',
  },
  right_elbow_inner: {
    areaId: 'right_elbow_inner',
    primaryLine: BODY_LINES.ARM,
    connectedAreas: ['right_bicep', 'right_forearm_front', 'right_wrist_front'],
    kidInsight: 'Your inner elbow is a meeting point for muscles from your shoulder and fingers!',
    proTip: 'Inner elbow pain (golfers elbow)? Check wrist flexor strength and grip patterns.',
    tcmConnection: 'Heart (HT) & Pericardium (PC)',
    hftPrinciple: 'Medial elbow stress - gripping patterns',
    researchSource: 'Myers, Anatomy Trains (DFAL)',
  },
  left_elbow_outer: {
    areaId: 'left_elbow_outer',
    primaryLine: BODY_LINES.ARM,
    connectedAreas: ['left_tricep', 'left_forearm_back', 'left_wrist_back'],
    kidInsight: 'Your outer elbow connects muscles that straighten your arm and extend your wrist!',
    proTip: 'Outer elbow pain (tennis elbow)? Check wrist extensor mobility and grip strength.',
    tcmConnection: 'Large Intestine (LI) & Triple Burner (TB)',
    hftPrinciple: 'Lateral elbow stress - extension patterns',
    researchSource: 'Myers, Anatomy Trains (SBAL)',
  },
  right_elbow_outer: {
    areaId: 'right_elbow_outer',
    primaryLine: BODY_LINES.ARM,
    connectedAreas: ['right_tricep', 'right_forearm_back', 'right_wrist_back'],
    kidInsight: 'Your outer elbow connects muscles that straighten your arm and extend your wrist!',
    proTip: 'Outer elbow pain (tennis elbow)? Check wrist extensor mobility and grip strength.',
    tcmConnection: 'Large Intestine (LI) & Triple Burner (TB)',
    hftPrinciple: 'Lateral elbow stress - extension patterns',
    researchSource: 'Myers, Anatomy Trains (SBAL)',
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // FOREARMS, WRISTS, HANDS
  // ═══════════════════════════════════════════════════════════════════════════════
  left_forearm_front: {
    areaId: 'left_forearm_front',
    primaryLine: BODY_LINES.ARM,
    connectedAreas: ['left_elbow_inner', 'left_wrist_front', 'left_palm'],
    kidInsight: 'Your forearm muscles control your grip - they connect from your elbow to your fingers!',
    proTip: 'Forearm tightness from gripping? Stretch wrist flexors and massage the forearm belly.',
    tcmConnection: 'Heart (HT), Lung (LU), Pericardium (PC)',
    hftPrinciple: 'Flexor chain - grip strength',
    researchSource: 'Myers, Anatomy Trains (DFAL, SFAL)',
  },
  right_forearm_front: {
    areaId: 'right_forearm_front',
    primaryLine: BODY_LINES.ARM,
    connectedAreas: ['right_elbow_inner', 'right_wrist_front', 'right_palm'],
    kidInsight: 'Your forearm muscles control your grip - they connect from your elbow to your fingers!',
    proTip: 'Forearm tightness from gripping? Stretch wrist flexors and massage the forearm belly.',
    tcmConnection: 'Heart (HT), Lung (LU), Pericardium (PC)',
    hftPrinciple: 'Flexor chain - grip strength',
    researchSource: 'Myers, Anatomy Trains (DFAL, SFAL)',
  },
  left_forearm_back: {
    areaId: 'left_forearm_back',
    primaryLine: BODY_LINES.ARM,
    connectedAreas: ['left_elbow_outer', 'left_wrist_back', 'left_hand_back'],
    kidInsight: 'The back of your forearm controls wrist extension and finger straightening!',
    proTip: 'Extensor forearm pain? Check tricep and rear shoulder mobility.',
    tcmConnection: 'Large Intestine (LI), Triple Burner (TB)',
    hftPrinciple: 'Extensor chain - release and control',
    researchSource: 'Myers, Anatomy Trains (SBAL, DBAL)',
  },
  right_forearm_back: {
    areaId: 'right_forearm_back',
    primaryLine: BODY_LINES.ARM,
    connectedAreas: ['right_elbow_outer', 'right_wrist_back', 'right_hand_back'],
    kidInsight: 'The back of your forearm controls wrist extension and finger straightening!',
    proTip: 'Extensor forearm pain? Check tricep and rear shoulder mobility.',
    tcmConnection: 'Large Intestine (LI), Triple Burner (TB)',
    hftPrinciple: 'Extensor chain - release and control',
    researchSource: 'Myers, Anatomy Trains (SBAL, DBAL)',
  },
  left_wrist_front: {
    areaId: 'left_wrist_front',
    primaryLine: BODY_LINES.ARM,
    connectedAreas: ['left_forearm_front', 'left_palm'],
    kidInsight: 'Your wrist is like a bridge between your forearm and hand!',
    proTip: 'Wrist pain? Check forearm flexor tension and finger mobility.',
    tcmConnection: 'Multiple meridian crossings - wrist crease points',
    hftPrinciple: 'Carpal tunnel zone - nerve and tendon passage',
    researchSource: 'Myers, Anatomy Trains (DFAL)',
  },
  right_wrist_front: {
    areaId: 'right_wrist_front',
    primaryLine: BODY_LINES.ARM,
    connectedAreas: ['right_forearm_front', 'right_palm'],
    kidInsight: 'Your wrist is like a bridge between your forearm and hand!',
    proTip: 'Wrist pain? Check forearm flexor tension and finger mobility.',
    tcmConnection: 'Multiple meridian crossings - wrist crease points',
    hftPrinciple: 'Carpal tunnel zone - nerve and tendon passage',
    researchSource: 'Myers, Anatomy Trains (DFAL)',
  },
  left_wrist_back: {
    areaId: 'left_wrist_back',
    primaryLine: BODY_LINES.ARM,
    connectedAreas: ['left_forearm_back', 'left_hand_back'],
    kidInsight: 'The back of your wrist connects to the muscles that open your hand!',
    proTip: 'Dorsal wrist pain often relates to overuse of extensor muscles.',
    tcmConnection: 'Large Intestine (LI) - wrist dorsum',
    hftPrinciple: 'Extensor retinaculum - tendon glide',
    researchSource: 'Myers, Anatomy Trains (SBAL)',
  },
  right_wrist_back: {
    areaId: 'right_wrist_back',
    primaryLine: BODY_LINES.ARM,
    connectedAreas: ['right_forearm_back', 'right_hand_back'],
    kidInsight: 'The back of your wrist connects to the muscles that open your hand!',
    proTip: 'Dorsal wrist pain often relates to overuse of extensor muscles.',
    tcmConnection: 'Large Intestine (LI) - wrist dorsum',
    hftPrinciple: 'Extensor retinaculum - tendon glide',
    researchSource: 'Myers, Anatomy Trains (SBAL)',
  },
  left_palm: {
    areaId: 'left_palm',
    primaryLine: BODY_LINES.ARM,
    connectedAreas: ['left_wrist_front', 'left_forearm_front'],
    kidInsight: 'Your palm has muscles that help you grip - they connect all the way up to your elbow!',
    proTip: 'Palm tension affects grip strength. Massage thenar and hypothenar muscles.',
    tcmConnection: 'Heart (HT) & Pericardium (PC) - palm points',
    hftPrinciple: 'Intrinsic hand muscles - fine motor control',
    researchSource: 'Myers, Anatomy Trains (DFAL)',
  },
  right_palm: {
    areaId: 'right_palm',
    primaryLine: BODY_LINES.ARM,
    connectedAreas: ['right_wrist_front', 'right_forearm_front'],
    kidInsight: 'Your palm has muscles that help you grip - they connect all the way up to your elbow!',
    proTip: 'Palm tension affects grip strength. Massage thenar and hypothenar muscles.',
    tcmConnection: 'Heart (HT) & Pericardium (PC) - palm points',
    hftPrinciple: 'Intrinsic hand muscles - fine motor control',
    researchSource: 'Myers, Anatomy Trains (DFAL)',
  },
  left_hand_back: {
    areaId: 'left_hand_back',
    primaryLine: BODY_LINES.ARM,
    connectedAreas: ['left_wrist_back', 'left_forearm_back'],
    kidInsight: 'The back of your hand connects to muscles that spread your fingers!',
    proTip: 'Dorsal hand pain? Check wrist mobility and extensor muscle health.',
    tcmConnection: 'Large Intestine (LI) & Triple Burner (TB)',
    hftPrinciple: 'Extensor mechanism - finger extension',
    researchSource: 'Myers, Anatomy Trains (SBAL)',
  },
  right_hand_back: {
    areaId: 'right_hand_back',
    primaryLine: BODY_LINES.ARM,
    connectedAreas: ['right_wrist_back', 'right_forearm_back'],
    kidInsight: 'The back of your hand connects to muscles that spread your fingers!',
    proTip: 'Dorsal hand pain? Check wrist mobility and extensor muscle health.',
    tcmConnection: 'Large Intestine (LI) & Triple Burner (TB)',
    hftPrinciple: 'Extensor mechanism - finger extension',
    researchSource: 'Myers, Anatomy Trains (SBAL)',
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // HIPS & GLUTES
  // ═══════════════════════════════════════════════════════════════════════════════
  left_hip_flexor: {
    areaId: 'left_hip_flexor',
    primaryLine: BODY_LINES.SFL,
    secondaryLines: [BODY_LINES.DFL],
    connectedAreas: ['lower_abs', 'left_quad_inner', 'left_groin'],
    kidInsight: 'Your hip flexor connects your spine to your leg - its what lifts your knee up!',
    proTip: 'Tight hip flexors? Often caused by sitting. Check psoas AND rectus femoris.',
    tcmConnection: 'Stomach (ST) & Spleen (SP)',
    hftPrinciple: 'Deep front line anchor - posture key',
    researchSource: 'Myers, Anatomy Trains (SFL, DFL)',
  },
  right_hip_flexor: {
    areaId: 'right_hip_flexor',
    primaryLine: BODY_LINES.SFL,
    secondaryLines: [BODY_LINES.DFL],
    connectedAreas: ['lower_abs', 'right_quad_inner', 'right_groin'],
    kidInsight: 'Your hip flexor connects your spine to your leg - its what lifts your knee up!',
    proTip: 'Tight hip flexors? Often caused by sitting. Check psoas AND rectus femoris.',
    tcmConnection: 'Stomach (ST) & Spleen (SP)',
    hftPrinciple: 'Deep front line anchor - posture key',
    researchSource: 'Myers, Anatomy Trains (SFL, DFL)',
  },
  left_groin: {
    areaId: 'left_groin',
    primaryLine: BODY_LINES.DFL,
    connectedAreas: ['left_hip_flexor', 'left_quad_inner', 'lower_abs'],
    kidInsight: 'Your groin muscles pull your leg inward and connect to your core!',
    proTip: 'Groin strain? Check adductor flexibility AND core stability. They work together.',
    tcmConnection: 'Liver (LV) & Kidney (KI) - inner leg pathway',
    hftPrinciple: 'Adductor chain - lateral stability',
    researchSource: 'Myers, Anatomy Trains (DFL)',
  },
  right_groin: {
    areaId: 'right_groin',
    primaryLine: BODY_LINES.DFL,
    connectedAreas: ['right_hip_flexor', 'right_quad_inner', 'lower_abs'],
    kidInsight: 'Your groin muscles pull your leg inward and connect to your core!',
    proTip: 'Groin strain? Check adductor flexibility AND core stability. They work together.',
    tcmConnection: 'Liver (LV) & Kidney (KI) - inner leg pathway',
    hftPrinciple: 'Adductor chain - lateral stability',
    researchSource: 'Myers, Anatomy Trains (DFL)',
  },
  left_glute: {
    areaId: 'left_glute',
    primaryLine: BODY_LINES.SBL,
    secondaryLines: [BODY_LINES.SPL],
    connectedAreas: ['lower_back_left', 'left_hamstring_outer', 'right_lat'],
    kidInsight: 'Your glute is one of the most powerful muscles! It connects to your back AND your opposite shoulder!',
    proTip: 'Weak glutes cause back pain. Train glute strength AND check opposite lat.',
    tcmConnection: 'Bladder (BL) & Gallbladder (GB)',
    hftPrinciple: 'Posterior oblique sling - power generator',
    researchSource: 'Myers, Anatomy Trains (SBL, Functional Lines)',
  },
  right_glute: {
    areaId: 'right_glute',
    primaryLine: BODY_LINES.SBL,
    secondaryLines: [BODY_LINES.SPL],
    connectedAreas: ['lower_back_right', 'right_hamstring_outer', 'left_lat'],
    kidInsight: 'Your glute is one of the most powerful muscles! It connects to your back AND your opposite shoulder!',
    proTip: 'Weak glutes cause back pain. Train glute strength AND check opposite lat.',
    tcmConnection: 'Bladder (BL) & Gallbladder (GB)',
    hftPrinciple: 'Posterior oblique sling - power generator',
    researchSource: 'Myers, Anatomy Trains (SBL, Functional Lines)',
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // THIGHS (QUADS & HAMSTRINGS)
  // ═══════════════════════════════════════════════════════════════════════════════
  left_quad_inner: {
    areaId: 'left_quad_inner',
    primaryLine: BODY_LINES.SFL,
    secondaryLines: [BODY_LINES.DFL],
    connectedAreas: ['left_hip_flexor', 'left_knee_front', 'left_groin'],
    kidInsight: 'Your inner quad helps straighten your knee and is part of the chain up to your belly!',
    proTip: 'Inner quad/VMO weakness? This affects knee tracking. Check hip flexor tightness too.',
    tcmConnection: 'Spleen (SP) - inner thigh pathway',
    hftPrinciple: 'Medial knee stabilization',
    researchSource: 'Myers, Anatomy Trains (SFL, DFL)',
  },
  left_quad_outer: {
    areaId: 'left_quad_outer',
    primaryLine: BODY_LINES.LL,
    connectedAreas: ['left_it_band', 'left_knee_front', 'left_hip_flexor'],
    kidInsight: 'Your outer quad works with your IT band to stabilize your knee from the side!',
    proTip: 'Outer quad tightness often accompanies IT band issues. Foam roll both.',
    tcmConnection: 'Gallbladder (GB) - lateral thigh',
    hftPrinciple: 'Lateral line stability',
    researchSource: 'Myers, Anatomy Trains (LL)',
  },
  right_quad_inner: {
    areaId: 'right_quad_inner',
    primaryLine: BODY_LINES.SFL,
    secondaryLines: [BODY_LINES.DFL],
    connectedAreas: ['right_hip_flexor', 'right_knee_front', 'right_groin'],
    kidInsight: 'Your inner quad helps straighten your knee and is part of the chain up to your belly!',
    proTip: 'Inner quad/VMO weakness? This affects knee tracking. Check hip flexor tightness too.',
    tcmConnection: 'Spleen (SP) - inner thigh pathway',
    hftPrinciple: 'Medial knee stabilization',
    researchSource: 'Myers, Anatomy Trains (SFL, DFL)',
  },
  right_quad_outer: {
    areaId: 'right_quad_outer',
    primaryLine: BODY_LINES.LL,
    connectedAreas: ['right_it_band', 'right_knee_front', 'right_hip_flexor'],
    kidInsight: 'Your outer quad works with your IT band to stabilize your knee from the side!',
    proTip: 'Outer quad tightness often accompanies IT band issues. Foam roll both.',
    tcmConnection: 'Gallbladder (GB) - lateral thigh',
    hftPrinciple: 'Lateral line stability',
    researchSource: 'Myers, Anatomy Trains (LL)',
  },
  left_hamstring_inner: {
    areaId: 'left_hamstring_inner',
    primaryLine: BODY_LINES.SBL,
    secondaryLines: [BODY_LINES.DFL],
    connectedAreas: ['left_glute', 'left_knee_back', 'left_calf_inner', 'lower_back_center'],
    kidInsight: 'Your hamstring is like one link in a chain that goes from your heel to the top of your head!',
    proTip: 'Hamstring tight? Check your calves AND neck. Theyre all on the Back Track!',
    tcmConnection: 'Bladder (BL) - posterior chain',
    hftPrinciple: 'SBL continuity - toe-touch restriction pattern',
    researchSource: 'Myers, Anatomy Trains (SBL)',
  },
  left_hamstring_outer: {
    areaId: 'left_hamstring_outer',
    primaryLine: BODY_LINES.SBL,
    secondaryLines: [BODY_LINES.LL],
    connectedAreas: ['left_glute', 'left_knee_back', 'left_calf_outer'],
    kidInsight: 'Your outer hamstring connects to your outer calf and side body!',
    proTip: 'Outer hamstring issue? Check IT band and lateral calf.',
    tcmConnection: 'Bladder (BL) & Gallbladder (GB)',
    hftPrinciple: 'Lateral stability during gait',
    researchSource: 'Myers, Anatomy Trains (SBL, LL)',
  },
  right_hamstring_inner: {
    areaId: 'right_hamstring_inner',
    primaryLine: BODY_LINES.SBL,
    secondaryLines: [BODY_LINES.DFL],
    connectedAreas: ['right_glute', 'right_knee_back', 'right_calf_inner', 'lower_back_center'],
    kidInsight: 'Your hamstring is like one link in a chain that goes from your heel to the top of your head!',
    proTip: 'Hamstring tight? Check your calves AND neck. Theyre all on the Back Track!',
    tcmConnection: 'Bladder (BL) - posterior chain',
    hftPrinciple: 'SBL continuity - toe-touch restriction pattern',
    researchSource: 'Myers, Anatomy Trains (SBL)',
  },
  right_hamstring_outer: {
    areaId: 'right_hamstring_outer',
    primaryLine: BODY_LINES.SBL,
    secondaryLines: [BODY_LINES.LL],
    connectedAreas: ['right_glute', 'right_knee_back', 'right_calf_outer'],
    kidInsight: 'Your outer hamstring connects to your outer calf and side body!',
    proTip: 'Outer hamstring issue? Check IT band and lateral calf.',
    tcmConnection: 'Bladder (BL) & Gallbladder (GB)',
    hftPrinciple: 'Lateral stability during gait',
    researchSource: 'Myers, Anatomy Trains (SBL, LL)',
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // KNEES
  // ═══════════════════════════════════════════════════════════════════════════════
  left_knee_front: {
    areaId: 'left_knee_front',
    primaryLine: BODY_LINES.SFL,
    connectedAreas: ['left_quad_inner', 'left_quad_outer', 'left_shin'],
    kidInsight: 'Your kneecap is like a shield that protects the front of your knee and helps your quads work!',
    proTip: 'Knee pain? Almost always caused by hip or ankle issues. Check above AND below.',
    tcmConnection: 'Stomach (ST) - knee crossing',
    hftPrinciple: 'Force transmission junction - the knee follows',
    researchSource: 'Myers, Anatomy Trains (SFL)',
  },
  right_knee_front: {
    areaId: 'right_knee_front',
    primaryLine: BODY_LINES.SFL,
    connectedAreas: ['right_quad_inner', 'right_quad_outer', 'right_shin'],
    kidInsight: 'Your kneecap is like a shield that protects the front of your knee and helps your quads work!',
    proTip: 'Knee pain? Almost always caused by hip or ankle issues. Check above AND below.',
    tcmConnection: 'Stomach (ST) - knee crossing',
    hftPrinciple: 'Force transmission junction - the knee follows',
    researchSource: 'Myers, Anatomy Trains (SFL)',
  },
  left_knee_back: {
    areaId: 'left_knee_back',
    primaryLine: BODY_LINES.SBL,
    connectedAreas: ['left_hamstring_inner', 'left_hamstring_outer', 'left_calf_inner', 'left_calf_outer'],
    kidInsight: 'The back of your knee is where your hamstrings and calves meet!',
    proTip: 'Posterior knee pain? Check hamstring and gastrocnemius flexibility.',
    tcmConnection: 'Bladder (BL) - popliteal point',
    hftPrinciple: 'SBL crossing - key mobility point',
    researchSource: 'Myers, Anatomy Trains (SBL)',
  },
  right_knee_back: {
    areaId: 'right_knee_back',
    primaryLine: BODY_LINES.SBL,
    connectedAreas: ['right_hamstring_inner', 'right_hamstring_outer', 'right_calf_inner', 'right_calf_outer'],
    kidInsight: 'The back of your knee is where your hamstrings and calves meet!',
    proTip: 'Posterior knee pain? Check hamstring and gastrocnemius flexibility.',
    tcmConnection: 'Bladder (BL) - popliteal point',
    hftPrinciple: 'SBL crossing - key mobility point',
    researchSource: 'Myers, Anatomy Trains (SBL)',
  },
  left_knee_side: {
    areaId: 'left_knee_side',
    primaryLine: BODY_LINES.LL,
    connectedAreas: ['left_it_band', 'left_quad_outer', 'left_calf_outer'],
    kidInsight: 'The side of your knee is stabilized by your IT band running down from your hip!',
    proTip: 'Lateral knee pain? IT band and TFL need attention. Dont just foam roll - strengthen too.',
    tcmConnection: 'Gallbladder (GB) - lateral knee',
    hftPrinciple: 'Lateral line stabilization',
    researchSource: 'Myers, Anatomy Trains (LL)',
  },
  right_knee_side: {
    areaId: 'right_knee_side',
    primaryLine: BODY_LINES.LL,
    connectedAreas: ['right_it_band', 'right_quad_outer', 'right_calf_outer'],
    kidInsight: 'The side of your knee is stabilized by your IT band running down from your hip!',
    proTip: 'Lateral knee pain? IT band and TFL need attention. Dont just foam roll - strengthen too.',
    tcmConnection: 'Gallbladder (GB) - lateral knee',
    hftPrinciple: 'Lateral line stabilization',
    researchSource: 'Myers, Anatomy Trains (LL)',
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // LOWER LEG (CALVES, SHINS, ANKLES)
  // ═══════════════════════════════════════════════════════════════════════════════
  left_shin: {
    areaId: 'left_shin',
    primaryLine: BODY_LINES.SFL,
    connectedAreas: ['left_knee_front', 'left_ankle_inside', 'left_foot_top'],
    kidInsight: 'Your shin muscles lift your toes up - they connect to the top of your foot!',
    proTip: 'Shin splints? Check calf tightness and ankle dorsiflexion. Also evaluate running mechanics.',
    tcmConnection: 'Stomach (ST) - anterior leg',
    hftPrinciple: 'Anterior compartment - toe clearance',
    researchSource: 'Myers, Anatomy Trains (SFL)',
  },
  right_shin: {
    areaId: 'right_shin',
    primaryLine: BODY_LINES.SFL,
    connectedAreas: ['right_knee_front', 'right_ankle_inside', 'right_foot_top'],
    kidInsight: 'Your shin muscles lift your toes up - they connect to the top of your foot!',
    proTip: 'Shin splints? Check calf tightness and ankle dorsiflexion. Also evaluate running mechanics.',
    tcmConnection: 'Stomach (ST) - anterior leg',
    hftPrinciple: 'Anterior compartment - toe clearance',
    researchSource: 'Myers, Anatomy Trains (SFL)',
  },
  left_calf_inner: {
    areaId: 'left_calf_inner',
    primaryLine: BODY_LINES.SBL,
    secondaryLines: [BODY_LINES.DFL],
    connectedAreas: ['left_knee_back', 'left_achilles', 'left_hamstring_inner'],
    kidInsight: 'Your inner calf connects up to your hamstring and down to your heel - its part of the Back Track!',
    proTip: 'Tight inner calf? This affects the whole posterior chain. Stretch calf AND hamstring.',
    tcmConnection: 'Kidney (KI) - medial calf',
    hftPrinciple: 'Deep posterior compartment - arch support',
    researchSource: 'Myers, Anatomy Trains (SBL, DFL)',
  },
  left_calf_outer: {
    areaId: 'left_calf_outer',
    primaryLine: BODY_LINES.SBL,
    secondaryLines: [BODY_LINES.LL],
    connectedAreas: ['left_knee_back', 'left_achilles', 'left_hamstring_outer'],
    kidInsight: 'Your outer calf helps you push off when you run and connects to your outer hamstring!',
    proTip: 'Lateral calf tightness? Check peroneal muscles and ankle stability.',
    tcmConnection: 'Bladder (BL) & Gallbladder (GB)',
    hftPrinciple: 'Lateral ankle stability',
    researchSource: 'Myers, Anatomy Trains (SBL, LL)',
  },
  right_calf_inner: {
    areaId: 'right_calf_inner',
    primaryLine: BODY_LINES.SBL,
    secondaryLines: [BODY_LINES.DFL],
    connectedAreas: ['right_knee_back', 'right_achilles', 'right_hamstring_inner'],
    kidInsight: 'Your inner calf connects up to your hamstring and down to your heel - its part of the Back Track!',
    proTip: 'Tight inner calf? This affects the whole posterior chain. Stretch calf AND hamstring.',
    tcmConnection: 'Kidney (KI) - medial calf',
    hftPrinciple: 'Deep posterior compartment - arch support',
    researchSource: 'Myers, Anatomy Trains (SBL, DFL)',
  },
  right_calf_outer: {
    areaId: 'right_calf_outer',
    primaryLine: BODY_LINES.SBL,
    secondaryLines: [BODY_LINES.LL],
    connectedAreas: ['right_knee_back', 'right_achilles', 'right_hamstring_outer'],
    kidInsight: 'Your outer calf helps you push off when you run and connects to your outer hamstring!',
    proTip: 'Lateral calf tightness? Check peroneal muscles and ankle stability.',
    tcmConnection: 'Bladder (BL) & Gallbladder (GB)',
    hftPrinciple: 'Lateral ankle stability',
    researchSource: 'Myers, Anatomy Trains (SBL, LL)',
  },
  left_achilles: {
    areaId: 'left_achilles',
    primaryLine: BODY_LINES.SBL,
    connectedAreas: ['left_calf_inner', 'left_calf_outer', 'left_heel'],
    kidInsight: 'Your Achilles tendon is the strongest tendon in your body - it connects your calf to your heel!',
    proTip: 'Achilles pain? Check calf flexibility AND eccentric strength. Never ignore Achilles issues.',
    tcmConnection: 'Kidney (KI) & Bladder (BL)',
    hftPrinciple: 'Elastic recoil - energy storage',
    researchSource: 'Myers, Anatomy Trains (SBL)',
  },
  right_achilles: {
    areaId: 'right_achilles',
    primaryLine: BODY_LINES.SBL,
    connectedAreas: ['right_calf_inner', 'right_calf_outer', 'right_heel'],
    kidInsight: 'Your Achilles tendon is the strongest tendon in your body - it connects your calf to your heel!',
    proTip: 'Achilles pain? Check calf flexibility AND eccentric strength. Never ignore Achilles issues.',
    tcmConnection: 'Kidney (KI) & Bladder (BL)',
    hftPrinciple: 'Elastic recoil - energy storage',
    researchSource: 'Myers, Anatomy Trains (SBL)',
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // ANKLES & FEET
  // ═══════════════════════════════════════════════════════════════════════════════
  left_ankle_inside: {
    areaId: 'left_ankle_inside',
    primaryLine: BODY_LINES.DFL,
    connectedAreas: ['left_shin', 'left_foot_top', 'left_calf_inner'],
    kidInsight: 'Your inside ankle connects to muscles that support your arch!',
    proTip: 'Medial ankle pain? Check posterior tibialis strength and arch support.',
    tcmConnection: 'Kidney (KI) & Spleen (SP)',
    hftPrinciple: 'Arch support chain',
    researchSource: 'Myers, Anatomy Trains (DFL)',
  },
  left_ankle_outside: {
    areaId: 'left_ankle_outside',
    primaryLine: BODY_LINES.LL,
    connectedAreas: ['left_calf_outer', 'left_foot_arch'],
    kidInsight: 'Your outside ankle has muscles that prevent you from rolling your ankle!',
    proTip: 'Lateral ankle instability? Train peroneals and work on single-leg balance.',
    tcmConnection: 'Gallbladder (GB) & Bladder (BL)',
    hftPrinciple: 'Lateral stability - eversion control',
    researchSource: 'Myers, Anatomy Trains (LL)',
  },
  right_ankle_inside: {
    areaId: 'right_ankle_inside',
    primaryLine: BODY_LINES.DFL,
    connectedAreas: ['right_shin', 'right_foot_top', 'right_calf_inner'],
    kidInsight: 'Your inside ankle connects to muscles that support your arch!',
    proTip: 'Medial ankle pain? Check posterior tibialis strength and arch support.',
    tcmConnection: 'Kidney (KI) & Spleen (SP)',
    hftPrinciple: 'Arch support chain',
    researchSource: 'Myers, Anatomy Trains (DFL)',
  },
  right_ankle_outside: {
    areaId: 'right_ankle_outside',
    primaryLine: BODY_LINES.LL,
    connectedAreas: ['right_calf_outer', 'right_foot_arch'],
    kidInsight: 'Your outside ankle has muscles that prevent you from rolling your ankle!',
    proTip: 'Lateral ankle instability? Train peroneals and work on single-leg balance.',
    tcmConnection: 'Gallbladder (GB) & Bladder (BL)',
    hftPrinciple: 'Lateral stability - eversion control',
    researchSource: 'Myers, Anatomy Trains (LL)',
  },
  left_heel: {
    areaId: 'left_heel',
    primaryLine: BODY_LINES.SBL,
    connectedAreas: ['left_achilles', 'left_foot_arch'],
    kidInsight: 'Your heel is the starting point of the Back Track - it connects all the way to your eyebrows!',
    proTip: 'Heel pain? Check plantar fascia AND calf tightness. The whole chain matters.',
    tcmConnection: 'Kidney (KI) - root point',
    hftPrinciple: 'SBL origin - ground contact',
    researchSource: 'Myers, Anatomy Trains (SBL)',
  },
  right_heel: {
    areaId: 'right_heel',
    primaryLine: BODY_LINES.SBL,
    connectedAreas: ['right_achilles', 'right_foot_arch'],
    kidInsight: 'Your heel is the starting point of the Back Track - it connects all the way to your eyebrows!',
    proTip: 'Heel pain? Check plantar fascia AND calf tightness. The whole chain matters.',
    tcmConnection: 'Kidney (KI) - root point',
    hftPrinciple: 'SBL origin - ground contact',
    researchSource: 'Myers, Anatomy Trains (SBL)',
  },
  left_foot_top: {
    areaId: 'left_foot_top',
    primaryLine: BODY_LINES.SFL,
    connectedAreas: ['left_shin', 'left_ankle_inside'],
    kidInsight: 'The top of your foot is where the Front Track starts - it goes all the way up to your face!',
    proTip: 'Top of foot pain? Check extensor tendons and ankle mobility.',
    tcmConnection: 'Stomach (ST) & Liver (LV)',
    hftPrinciple: 'SFL origin - toe extension',
    researchSource: 'Myers, Anatomy Trains (SFL)',
  },
  right_foot_top: {
    areaId: 'right_foot_top',
    primaryLine: BODY_LINES.SFL,
    connectedAreas: ['right_shin', 'right_ankle_inside'],
    kidInsight: 'The top of your foot is where the Front Track starts - it goes all the way up to your face!',
    proTip: 'Top of foot pain? Check extensor tendons and ankle mobility.',
    tcmConnection: 'Stomach (ST) & Liver (LV)',
    hftPrinciple: 'SFL origin - toe extension',
    researchSource: 'Myers, Anatomy Trains (SFL)',
  },
  left_foot_arch: {
    areaId: 'left_foot_arch',
    primaryLine: BODY_LINES.DFL,
    connectedAreas: ['left_heel', 'left_ankle_inside', 'left_calf_inner'],
    kidInsight: 'Your arch is like a spring that helps you jump and run! It connects up into your core.',
    proTip: 'Arch pain (plantar fasciitis)? Check calf flexibility AND big toe mobility. The chain continues.',
    tcmConnection: 'Kidney (KI) - sole of foot',
    hftPrinciple: 'Deep front line origin - core to floor connection',
    researchSource: 'Myers, Anatomy Trains (DFL)',
  },
  right_foot_arch: {
    areaId: 'right_foot_arch',
    primaryLine: BODY_LINES.DFL,
    connectedAreas: ['right_heel', 'right_ankle_inside', 'right_calf_inner'],
    kidInsight: 'Your arch is like a spring that helps you jump and run! It connects up into your core.',
    proTip: 'Arch pain (plantar fasciitis)? Check calf flexibility AND big toe mobility. The chain continues.',
    tcmConnection: 'Kidney (KI) - sole of foot',
    hftPrinciple: 'Deep front line origin - core to floor connection',
    researchSource: 'Myers, Anatomy Trains (DFL)',
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // SIDE BODY (IT BAND, OBLIQUES, ETC)
  // ═══════════════════════════════════════════════════════════════════════════════
  left_it_band: {
    areaId: 'left_it_band',
    primaryLine: BODY_LINES.LL,
    connectedAreas: ['left_glute', 'left_quad_outer', 'left_knee_side', 'left_oblique'],
    kidInsight: 'Your IT band is like a thick rubber band on the side of your leg connecting hip to knee!',
    proTip: 'Tight IT band? Foam rolling helps, but also strengthen glutes and TFL. The IT band is a symptom.',
    tcmConnection: 'Gallbladder (GB) - lateral leg',
    hftPrinciple: 'Lateral stability tensioner - not a muscle!',
    researchSource: 'Myers, Anatomy Trains (LL)',
  },
  right_it_band: {
    areaId: 'right_it_band',
    primaryLine: BODY_LINES.LL,
    connectedAreas: ['right_glute', 'right_quad_outer', 'right_knee_side', 'right_oblique'],
    kidInsight: 'Your IT band is like a thick rubber band on the side of your leg connecting hip to knee!',
    proTip: 'Tight IT band? Foam rolling helps, but also strengthen glutes and TFL. The IT band is a symptom.',
    tcmConnection: 'Gallbladder (GB) - lateral leg',
    hftPrinciple: 'Lateral stability tensioner - not a muscle!',
    researchSource: 'Myers, Anatomy Trains (LL)',
  },
  left_oblique: {
    areaId: 'left_oblique',
    primaryLine: BODY_LINES.LL,
    secondaryLines: [BODY_LINES.SPL],
    connectedAreas: ['left_ribs', 'left_it_band', 'lower_back_left', 'right_shoulder_front'],
    kidInsight: 'Your obliques twist your body and connect from your ribs to your hips - AND to your opposite shoulder!',
    proTip: 'Oblique strain? Often from rotational overload. Check hip mobility and thoracic rotation.',
    tcmConnection: 'Gallbladder (GB) - lateral torso',
    hftPrinciple: 'Rotational power transfer - spiral sling',
    researchSource: 'Myers, Anatomy Trains (LL, SPL)',
  },
  right_oblique: {
    areaId: 'right_oblique',
    primaryLine: BODY_LINES.LL,
    secondaryLines: [BODY_LINES.SPL],
    connectedAreas: ['right_ribs', 'right_it_band', 'lower_back_right', 'left_shoulder_front'],
    kidInsight: 'Your obliques twist your body and connect from your ribs to your hips - AND to your opposite shoulder!',
    proTip: 'Oblique strain? Often from rotational overload. Check hip mobility and thoracic rotation.',
    tcmConnection: 'Gallbladder (GB) - lateral torso',
    hftPrinciple: 'Rotational power transfer - spiral sling',
    researchSource: 'Myers, Anatomy Trains (LL, SPL)',
  },
  left_ribs: {
    areaId: 'left_ribs',
    primaryLine: BODY_LINES.LL,
    connectedAreas: ['left_oblique', 'left_lat', 'left_chest'],
    kidInsight: 'Your ribs connect to muscles all around you - front, side, and back!',
    proTip: 'Rib pain? Check breathing mechanics and intercostal mobility.',
    tcmConnection: 'Liver (LV) & Gallbladder (GB)',
    hftPrinciple: 'Rib cage mobility - breathing capacity',
    researchSource: 'Myers, Anatomy Trains (LL)',
  },
  right_ribs: {
    areaId: 'right_ribs',
    primaryLine: BODY_LINES.LL,
    connectedAreas: ['right_oblique', 'right_lat', 'right_chest'],
    kidInsight: 'Your ribs connect to muscles all around you - front, side, and back!',
    proTip: 'Rib pain? Check breathing mechanics and intercostal mobility.',
    tcmConnection: 'Liver (LV) & Gallbladder (GB)',
    hftPrinciple: 'Rib cage mobility - breathing capacity',
    researchSource: 'Myers, Anatomy Trains (LL)',
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // HEAD SIDE AREAS
  // ═══════════════════════════════════════════════════════════════════════════════
  left_temple: {
    areaId: 'left_temple',
    primaryLine: BODY_LINES.LL,
    connectedAreas: ['left_jaw', 'left_neck_side'],
    kidInsight: 'Your temple connects to your jaw and neck - tension here can cause headaches!',
    proTip: 'Temple headaches? Check jaw clenching and neck side tension.',
    tcmConnection: 'Gallbladder (GB) - temple points',
    hftPrinciple: 'Lateral cranial tension',
    researchSource: 'Myers, Anatomy Trains (LL)',
  },
  right_temple: {
    areaId: 'right_temple',
    primaryLine: BODY_LINES.LL,
    connectedAreas: ['right_jaw', 'right_neck_side'],
    kidInsight: 'Your temple connects to your jaw and neck - tension here can cause headaches!',
    proTip: 'Temple headaches? Check jaw clenching and neck side tension.',
    tcmConnection: 'Gallbladder (GB) - temple points',
    hftPrinciple: 'Lateral cranial tension',
    researchSource: 'Myers, Anatomy Trains (LL)',
  },
  left_jaw: {
    areaId: 'left_jaw',
    primaryLine: BODY_LINES.DFL,
    secondaryLines: [BODY_LINES.LL],
    connectedAreas: ['left_temple', 'left_neck_side', 'neck_front'],
    kidInsight: 'Your jaw connects down through your neck to your breathing muscle!',
    proTip: 'Jaw tension (TMJ)? Often related to stress AND hip tension. The DFL connects them.',
    tcmConnection: 'Stomach (ST) - jaw branch',
    hftPrinciple: 'Jaw-tongue-diaphragm-pelvic floor connection',
    researchSource: 'Myers, Anatomy Trains (DFL)',
  },
  right_jaw: {
    areaId: 'right_jaw',
    primaryLine: BODY_LINES.DFL,
    secondaryLines: [BODY_LINES.LL],
    connectedAreas: ['right_temple', 'right_neck_side', 'neck_front'],
    kidInsight: 'Your jaw connects down through your neck to your breathing muscle!',
    proTip: 'Jaw tension (TMJ)? Often related to stress AND hip tension. The DFL connects them.',
    tcmConnection: 'Stomach (ST) - jaw branch',
    hftPrinciple: 'Jaw-tongue-diaphragm-pelvic floor connection',
    researchSource: 'Myers, Anatomy Trains (DFL)',
  },
  left_neck_side: {
    areaId: 'left_neck_side',
    primaryLine: BODY_LINES.LL,
    connectedAreas: ['left_temple', 'left_deltoid', 'left_ribs'],
    kidInsight: 'The side of your neck connects down to your shoulder and ribs!',
    proTip: 'Side neck tightness? Check shoulder position and rib cage mobility.',
    tcmConnection: 'Gallbladder (GB) - SCM and scalenes',
    hftPrinciple: 'Lateral neck stabilizers',
    researchSource: 'Myers, Anatomy Trains (LL)',
  },
  right_neck_side: {
    areaId: 'right_neck_side',
    primaryLine: BODY_LINES.LL,
    connectedAreas: ['right_temple', 'right_deltoid', 'right_ribs'],
    kidInsight: 'The side of your neck connects down to your shoulder and ribs!',
    proTip: 'Side neck tightness? Check shoulder position and rib cage mobility.',
    tcmConnection: 'Gallbladder (GB) - SCM and scalenes',
    hftPrinciple: 'Lateral neck stabilizers',
    researchSource: 'Myers, Anatomy Trains (LL)',
  },
  left_deltoid: {
    areaId: 'left_deltoid',
    primaryLine: BODY_LINES.ARM,
    secondaryLines: [BODY_LINES.LL],
    connectedAreas: ['left_neck_side', 'left_shoulder_front', 'left_shoulder_back', 'left_bicep', 'left_tricep'],
    kidInsight: 'Your deltoid is the cap on your shoulder - it connects your arm to your body from all angles!',
    proTip: 'Deltoid pain? Check rotator cuff and thoracic spine mobility.',
    tcmConnection: 'Large Intestine (LI) & Triple Burner (TB)',
    hftPrinciple: 'Shoulder force distribution',
    researchSource: 'Myers, Anatomy Trains (Arm Lines)',
  },
  right_deltoid: {
    areaId: 'right_deltoid',
    primaryLine: BODY_LINES.ARM,
    secondaryLines: [BODY_LINES.LL],
    connectedAreas: ['right_neck_side', 'right_shoulder_front', 'right_shoulder_back', 'right_bicep', 'right_tricep'],
    kidInsight: 'Your deltoid is the cap on your shoulder - it connects your arm to your body from all angles!',
    proTip: 'Deltoid pain? Check rotator cuff and thoracic spine mobility.',
    tcmConnection: 'Large Intestine (LI) & Triple Burner (TB)',
    hftPrinciple: 'Shoulder force distribution',
    researchSource: 'Myers, Anatomy Trains (Arm Lines)',
  },
  head_back: {
    areaId: 'head_back',
    primaryLine: BODY_LINES.SBL,
    connectedAreas: ['neck_back', 'left_upper_back', 'right_upper_back'],
    kidInsight: 'The back of your head is where the Back Track ends - it comes all the way from your heels!',
    proTip: 'Headaches at the back of your head? Check your whole posterior chain, especially calves.',
    tcmConnection: 'Bladder (BL) & Governing Vessel (GV)',
    hftPrinciple: 'SBL terminus - suboccipital tension',
    researchSource: 'Myers, Anatomy Trains (SBL)',
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get fascia connection info for a body area
 */
export function getFasciaConnection(areaId: string): BodyConnectionInfo | null {
  return FASCIA_CONNECTIONS[areaId] || null;
}

/**
 * Get all connected areas for a given body area
 */
export function getConnectedAreas(areaId: string): string[] {
  const connection = FASCIA_CONNECTIONS[areaId];
  return connection?.connectedAreas || [];
}

/**
 * Get the primary body line for an area
 */
export function getPrimaryBodyLine(areaId: string): BodyLine | null {
  const connection = FASCIA_CONNECTIONS[areaId];
  return connection?.primaryLine || null;
}

/**
 * Get the dominant body line across multiple pain areas
 */
export function getDominantBodyLine(painAreas: { area: string; occurrences: number }[]): BodyLine | null {
  const lineFrequency: Record<string, { line: BodyLine; count: number }> = {};
  
  painAreas.forEach(({ area, occurrences }) => {
    const connection = FASCIA_CONNECTIONS[area];
    if (connection) {
      const lineId = connection.primaryLine.id;
      if (!lineFrequency[lineId]) {
        lineFrequency[lineId] = { line: connection.primaryLine, count: 0 };
      }
      lineFrequency[lineId].count += occurrences;
    }
  });
  
  const sorted = Object.values(lineFrequency).sort((a, b) => b.count - a.count);
  return sorted[0]?.line || null;
}

/**
 * Generate a kid-friendly summary of body line involvement
 */
export function generateBodyLineSummary(painAreas: string[]): string {
  const lineMap: Record<string, number> = {};
  
  painAreas.forEach(areaId => {
    const connection = FASCIA_CONNECTIONS[areaId];
    if (connection) {
      const kidName = connection.primaryLine.kidName;
      lineMap[kidName] = (lineMap[kidName] || 0) + 1;
    }
  });
  
  const sorted = Object.entries(lineMap).sort(([,a], [,b]) => b - a);
  if (sorted.length === 0) return 'No specific body line pattern detected.';
  
  const primary = sorted[0];
  if (primary[1] >= 2) {
    return `Most of your tight spots are on the "${primary[0]}"! This is one connected chain.`;
  }
  
  return `Your tight spots are spread across different body lines: ${sorted.map(([name]) => name).join(', ')}.`;
}

/**
 * Get connected areas to check based on pain areas
 */
export function getConnectedAreasToCheck(painAreas: string[]): string[] {
  const allConnected = new Set<string>();
  const painSet = new Set(painAreas);
  
  painAreas.forEach(areaId => {
    const connected = getConnectedAreas(areaId);
    connected.forEach(area => {
      if (!painSet.has(area)) {
        allConnected.add(area);
      }
    });
  });
  
  return Array.from(allConnected).slice(0, 5);
}
