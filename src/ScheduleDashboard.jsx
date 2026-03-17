import { useState, useMemo } from "react";

// ─── DATA ────────────────────────────────────────────────────────────────────

const DAYS = ["Ma","Di","Wo","Do","Vr","Za","Zo"];
const DAY_LABELS = { Ma:"Maandag",Di:"Dinsdag",Wo:"Woensdag",Do:"Donderdag",Vr:"Vrijdag",Za:"Zaterdag",Zo:"Zondag" };

const CATEGORIES = [
  { key:"jeugd",      label:"Jeugd",            keywords:["jeugd","youth","kids","kidsles","13-17","6-12","12-17"],          color:"#06d6a0" },
  { key:"bjj",        label:"BJJ / Grappling",  keywords:["bjj","jiu jitsu","jitsu","grappling","agua","submission"],        color:"#3a86ff" },
  { key:"wrestling",  label:"Worstelen",         keywords:["amsterdam airlines","wrestling","worstelen"],                     color:"#2ec4b6" },
  { key:"mma",        label:"MMA",               keywords:["mma"],                                                            color:"#E63946" },
  { key:"kickboks",   label:"Kickboksen",         keywords:["kickboks","kickbox","muay thai","personal training"],             color:"#ffb703" },
  { key:"bokszak",    label:"Bokszaktraining",    keywords:["bokszaktraining","bokszak","Bagtraining","Heavybag","zak","bag"],  color:"#8ac926" },
  { key:"boksen",     label:"Boksen",             keywords:["boksen","boxing","Boksconditie"],                                        color:"#fb5607" },
  { key:"openmat",    label:"Open Mat",           keywords:["open mat","sparring","sparren","Zelftraining"],                                                       color:"#8338ec" },
  { key:"hyrox",      label:"Hyrox / Cardio",     keywords:["hyrox"],                                                          color:"#4cc9f0" },
  { key:"strength",   label:"Strength",           keywords:["strength","krachttraining","powerlifting","body strength"],       color:"#f77f00" },
  { key:"overig",     label:"Overig",              keywords:[],                                                                  color:"#505068" },
];

const SLOTS = [
  { key:"ochtend", label:"Ochtend", from:6*60,  to:12*60, color:"#f59e0b" },
  { key:"middag",  label:"Middag",  from:12*60, to:17*60, color:"#06d6a0" },
  { key:"avond",   label:"Avond",   from:17*60, to:24*60, color:"#8338ec" },
];

const PALETTE = [
  "#E63946","#3a86ff","#06d6a0","#ffb703","#8338ec",
  "#fb5607","#2ec4b6","#f77f00","#4cc9f0","#80b918",
  "#e9c46a","#9d4edd","#f72585","#023e8a","#b5179e",
  "#264653","#e76f51","#2d6a4f","#7209b7","#3c096c",
  "#ff006e","#8ac926","#1982c4","#6a4c93","#f4a261",
];

const gyms = [
  {
    id: 0, name: "ATC", isAtc: true,
    schedule: [
      { day:"Ma", time:"07:00", end:"08:30", cls:"United Fighters – BJJ" },
      { day:"Ma", time:"12:00", end:"13:30", cls:"10th Planet Jiu Jitsu" },
      { day:"Ma", time:"13:30", end:"15:00", cls:"Amsterdam Airlines" },
      { day:"Ma", time:"17:00", end:"18:00", cls:"Open Mat" },
      { day:"Ma", time:"18:00", end:"18:45", cls:"Bokszaktraining" },
      { day:"Ma", time:"18:45", end:"20:00", cls:"MMA" },
      { day:"Ma", time:"20:00", end:"21:00", cls:"Kickboksen" },
      { day:"Ma", time:"21:00", end:"22:30", cls:"10th Planet Jiu Jitsu" },
      { day:"Di", time:"10:00", end:"11:15", cls:"MMA" },
      { day:"Di", time:"12:00", end:"13:30", cls:"10th Planet Jiu Jitsu" },
      { day:"Di", time:"16:45", end:"18:00", cls:"Jeugd MMA" },
      { day:"Di", time:"18:00", end:"18:45", cls:"Bokszaktraining" },
      { day:"Di", time:"18:45", end:"20:00", cls:"MMA" },
      { day:"Di", time:"20:15", end:"21:45", cls:"Team Agua – BJJ" },
      { day:"Wo", time:"07:00", end:"08:30", cls:"United Fighters – BJJ" },
      { day:"Wo", time:"12:00", end:"13:30", cls:"10th Planet Jiu Jitsu" },
      { day:"Wo", time:"17:00", end:"18:00", cls:"Open Mat" },
      { day:"Wo", time:"18:00", end:"18:45", cls:"Bokszaktraining" },
      { day:"Wo", time:"18:45", end:"20:00", cls:"MMA" },
      { day:"Wo", time:"20:00", end:"21:00", cls:"Kickboksen" },
      { day:"Wo", time:"21:00", end:"22:30", cls:"10th Planet Jiu Jitsu" },
      { day:"Do", time:"10:00", end:"11:15", cls:"MMA" },
      { day:"Do", time:"12:00", end:"13:30", cls:"10th Planet Jiu Jitsu" },
      { day:"Do", time:"16:45", end:"18:00", cls:"Jeugd MMA" },
      { day:"Do", time:"18:00", end:"18:45", cls:"Bokszaktraining" },
      { day:"Do", time:"18:45", end:"20:00", cls:"MMA" },
      { day:"Do", time:"20:15", end:"21:45", cls:"Team Agua – BJJ" },
      { day:"Vr", time:"07:00", end:"08:30", cls:"United Fighters – BJJ" },
      { day:"Vr", time:"17:00", end:"18:00", cls:"Open Mat" },
      { day:"Vr", time:"18:00", end:"18:45", cls:"Bokszaktraining" },
      { day:"Vr", time:"18:45", end:"20:00", cls:"MMA" },
      { day:"Vr", time:"20:00", end:"21:00", cls:"Amsterdam Airlines" },
      { day:"Vr", time:"21:00", end:"22:30", cls:"10th Planet Jiu Jitsu" },
      { day:"Za", time:"11:00", end:"12:00", cls:"Flow Fit" },
      { day:"Za", time:"12:00", end:"13:00", cls:"Kickboksen" },
      { day:"Za", time:"13:00", end:"14:30", cls:"Team Agua – BJJ" },
      { day:"Za", time:"19:30", end:"21:00", cls:"10th Planet Jiu Jitsu" },
      { day:"Zo", time:"08:30", end:"11:00", cls:"Personal Training" },
      { day:"Zo", time:"11:30", end:"13:00", cls:"10th Planet Jiu Jitsu" },
      { day:"Zo", time:"13:00", end:"14:30", cls:"Team Agua – BJJ" },
    ],
  },
  {
    id: 1, name: "Gym Royale", isAtc: false,
    schedule: [
      { day:"Ma", time:"07:00", end:"08:00", cls:"Hyrox" },
      { day:"Ma", time:"08:00", end:"09:00", cls:"Full Body Strength and Conditioning" },
      { day:"Ma", time:"09:00", end:"10:00", cls:"BJJ no Gi" },
      { day:"Ma", time:"09:00", end:"10:00", cls:"Kickboksen zak" },
      { day:"Ma", time:"12:00", end:"13:00", cls:"Kickboksen zak" },
      { day:"Ma", time:"16:00", end:"17:00", cls:"Kidsles Kickboksen" },
      { day:"Ma", time:"17:00", end:"18:00", cls:"Kickboks 13-17 jaar" },
      { day:"Ma", time:"18:00", end:"19:00", cls:"Full Body Strength" },
      { day:"Ma", time:"18:00", end:"19:00", cls:"Kickboksen zak" },
      { day:"Ma", time:"19:00", end:"20:00", cls:"Hyrox" },
      { day:"Ma", time:"19:00", end:"20:00", cls:"Kickboks techniek" },
      { day:"Ma", time:"20:00", end:"21:00", cls:"Boksen Beginners" },
      { day:"Di", time:"07:00", end:"08:00", cls:"Kickboksen zak" },
      { day:"Di", time:"08:00", end:"09:00", cls:"Lower Body Strength" },
      { day:"Di", time:"09:00", end:"10:00", cls:"BJJ" },
      { day:"Di", time:"09:00", end:"10:00", cls:"Kickboksen techniek" },
      { day:"Di", time:"10:30", end:"11:30", cls:"55+ krachttraining" },
      { day:"Di", time:"12:00", end:"13:00", cls:"Kickboksen zak" },
      { day:"Di", time:"18:00", end:"19:00", cls:"Kickboksen zak" },
      { day:"Di", time:"18:00", end:"19:00", cls:"Lower Body Strength" },
      { day:"Di", time:"19:00", end:"20:00", cls:"Boksen" },
      { day:"Di", time:"19:00", end:"20:00", cls:"Hyrox" },
      { day:"Di", time:"20:00", end:"21:00", cls:"BJJ" },
      { day:"Wo", time:"07:00", end:"08:00", cls:"BJJ no Gi" },
      { day:"Wo", time:"07:00", end:"08:00", cls:"Hyrox" },
      { day:"Wo", time:"08:00", end:"09:00", cls:"Full Body Strength" },
      { day:"Wo", time:"09:00", end:"10:00", cls:"BJJ no Gi" },
      { day:"Wo", time:"09:00", end:"10:00", cls:"Kickboksen zak" },
      { day:"Wo", time:"11:00", end:"12:00", cls:"Bedrijfstraining" },
      { day:"Wo", time:"12:00", end:"13:00", cls:"Hyrox" },
      { day:"Wo", time:"12:00", end:"13:00", cls:"Kickboksen zak" },
      { day:"Wo", time:"13:00", end:"14:00", cls:"Bedrijfstraining" },
      { day:"Wo", time:"16:00", end:"17:00", cls:"Kidsles Kickboksen" },
      { day:"Wo", time:"17:00", end:"18:00", cls:"Kickboks 13-17 jaar" },
      { day:"Wo", time:"17:30", end:"18:30", cls:"Full Body Strength" },
      { day:"Wo", time:"18:00", end:"19:00", cls:"Kickboksen zak" },
      { day:"Wo", time:"18:30", end:"19:30", cls:"Hyrox" },
      { day:"Wo", time:"19:00", end:"20:00", cls:"Kickboks techniek" },
      { day:"Wo", time:"20:00", end:"21:00", cls:"BJJ no Gi" },
      { day:"Do", time:"08:00", end:"09:00", cls:"Upper body Strength" },
      { day:"Do", time:"09:00", end:"10:00", cls:"BJJ" },
      { day:"Do", time:"09:00", end:"10:00", cls:"Kickboksen techniek" },
      { day:"Do", time:"10:30", end:"11:30", cls:"55+ boksen" },
      { day:"Do", time:"12:00", end:"13:00", cls:"Kickboksen zak" },
      { day:"Do", time:"18:00", end:"19:00", cls:"Kickboksen zak" },
      { day:"Do", time:"18:00", end:"19:00", cls:"Upper body Strength" },
      { day:"Do", time:"19:00", end:"20:00", cls:"HYROX + interval" },
      { day:"Do", time:"19:00", end:"20:00", cls:"Boksen" },
      { day:"Do", time:"20:00", end:"21:00", cls:"Kickboksen techniek" },
      { day:"Vr", time:"07:00", end:"08:00", cls:"BJJ" },
      { day:"Vr", time:"07:00", end:"08:00", cls:"Hyrox" },
      { day:"Vr", time:"07:00", end:"08:00", cls:"Kickboksen zak" },
      { day:"Vr", time:"08:00", end:"09:00", cls:"Full Body Strength" },
      { day:"Vr", time:"09:00", end:"10:00", cls:"BJJ no Gi" },
      { day:"Vr", time:"09:00", end:"10:00", cls:"Kickboksen techniek" },
      { day:"Vr", time:"12:00", end:"13:00", cls:"Hyrox" },
      { day:"Vr", time:"12:00", end:"13:00", cls:"Kickboksen zak" },
      { day:"Vr", time:"13:30", end:"15:30", cls:"Workshop" },
      { day:"Vr", time:"16:00", end:"17:00", cls:"Kidsles Kickboksen" },
      { day:"Vr", time:"17:00", end:"18:00", cls:"Kickboks 13-17 jaar" },
      { day:"Vr", time:"18:00", end:"19:00", cls:"Hyrox" },
      { day:"Vr", time:"18:00", end:"19:00", cls:"Kickboksen zak" },
      { day:"Vr", time:"19:00", end:"20:00", cls:"Kickboksen techniek" },
      { day:"Za", time:"09:00", end:"10:00", cls:"Lower Body Strength" },
      { day:"Za", time:"10:00", end:"11:00", cls:"Full Body Strength" },
      { day:"Za", time:"10:00", end:"11:00", cls:"Kickboksen zak" },
      { day:"Za", time:"11:00", end:"12:00", cls:"Hyrox" },
      { day:"Za", time:"11:00", end:"12:00", cls:"Kickboksen techniek" },
      { day:"Za", time:"12:00", end:"13:00", cls:"BJJ no Gi" },
      { day:"Za", time:"12:00", end:"13:00", cls:"Kickboksen zak" },
      { day:"Za", time:"14:00", end:"16:00", cls:"Bedrijfstraining" },
      { day:"Zo", time:"10:00", end:"11:00", cls:"Kickboksen zak" },
      { day:"Zo", time:"10:00", end:"11:00", cls:"Open mat" },
      { day:"Zo", time:"11:00", end:"12:00", cls:"Upper body Strength" },
      { day:"Zo", time:"11:00", end:"12:00", cls:"Techniek combi" },
      { day:"Zo", time:"12:00", end:"13:00", cls:"Hyrox" },
    ],
  },
  {
    id: 2, name: "Eastbound Gym", isAtc: false,
    schedule: [
      { day:"Ma", time:"08:30", end:"09:30", cls:"Strength & Conditioning" },
      { day:"Ma", time:"08:30", end:"09:30", cls:"Boxing - Bagtraining" },
      { day:"Ma", time:"15:30", end:"16:30", cls:"Kickboksen Jeugd 6-12 jaar" },
      { day:"Ma", time:"16:30", end:"17:30", cls:"Kickboksen Jeugd 12-17 jaar" },
      { day:"Ma", time:"17:00", end:"18:00", cls:"Kickboxing - Beginners" },
      { day:"Ma", time:"17:30", end:"18:30", cls:"Boxing - Bagtraining" },
      { day:"Ma", time:"18:00", end:"19:00", cls:"Strength & Conditioning" },
      { day:"Ma", time:"18:00", end:"19:00", cls:"Kickboxing - Beginners" },
      { day:"Ma", time:"18:30", end:"19:30", cls:"Boxing - Bagtraining" },
      { day:"Ma", time:"19:00", end:"20:00", cls:"Kickboxing - Advanced" },
      { day:"Ma", time:"19:00", end:"20:00", cls:"Strength" },
      { day:"Ma", time:"19:30", end:"20:30", cls:"Boxing - Bagtraining" },
      { day:"Ma", time:"20:00", end:"21:00", cls:"Muay Thai - All levels" },
      { day:"Ma", time:"20:30", end:"22:00", cls:"Grappling/BJJ - No Gi - Intermediate" },
      { day:"Di", time:"07:30", end:"08:30", cls:"Boxing - Bagtraining" },
      { day:"Di", time:"07:30", end:"08:30", cls:"Strength & Conditioning" },
      { day:"Di", time:"08:00", end:"09:30", cls:"Brazilian Jiu Jitsu - Gi - Beginners" },
      { day:"Di", time:"08:30", end:"09:30", cls:"Kickboxing - Bagtraining" },
      { day:"Di", time:"12:00", end:"13:00", cls:"Boxing - All levels" },
      { day:"Di", time:"17:30", end:"18:30", cls:"Kickboxing - Bagtraining" },
      { day:"Di", time:"18:00", end:"19:00", cls:"Strength & Conditioning" },
      { day:"Di", time:"18:00", end:"19:00", cls:"Boxing - Beginners" },
      { day:"Di", time:"18:30", end:"19:30", cls:"Kickboxing - Bagtraining" },
      { day:"Di", time:"19:00", end:"20:00", cls:"Boxing - Advanced" },
      { day:"Di", time:"19:00", end:"20:00", cls:"HYROX" },
      { day:"Di", time:"19:30", end:"20:30", cls:"Kickboxing - Bagtraining" },
      { day:"Di", time:"20:00", end:"21:00", cls:"Boxing - All levels" },
      { day:"Di", time:"20:30", end:"22:00", cls:"BJJ / Grappling - No Gi - Beginners" },
      { day:"Wo", time:"07:30", end:"08:30", cls:"Yoga - Vinyasa flow" },
      { day:"Wo", time:"08:00", end:"09:30", cls:"BJJ / Grappling - No Gi - All levels" },
      { day:"Wo", time:"08:30", end:"09:30", cls:"Boxing - Bagtraining" },
      { day:"Wo", time:"08:30", end:"09:30", cls:"Strength & Conditioning" },
      { day:"Wo", time:"09:30", end:"10:30", cls:"Kickboxing - Bagtraining" },
      { day:"Wo", time:"11:00", end:"12:00", cls:"Boxing - All levels" },
      { day:"Wo", time:"15:30", end:"16:30", cls:"Kickboxing Youth 6-12" },
      { day:"Wo", time:"16:30", end:"17:30", cls:"Kickboxing Youth 12-17" },
      { day:"Wo", time:"17:00", end:"18:00", cls:"Powerlifting" },
      { day:"Wo", time:"17:30", end:"18:30", cls:"Boxing - Bagtraining" },
      { day:"Wo", time:"18:00", end:"19:00", cls:"Kickboxing - Beginners" },
      { day:"Wo", time:"18:00", end:"19:00", cls:"Strength - Lower body" },
      { day:"Wo", time:"18:30", end:"19:30", cls:"Boxing - Bagtraining" },
      { day:"Wo", time:"19:00", end:"20:00", cls:"Kickboxing - Advanced" },
      { day:"Wo", time:"19:00", end:"20:00", cls:"Strength & Conditioning" },
      { day:"Wo", time:"19:30", end:"20:30", cls:"Boxing - Bagtraining" },
      { day:"Wo", time:"20:00", end:"21:00", cls:"Muay Thai - All levels" },
      { day:"Wo", time:"20:30", end:"22:00", cls:"Grappling / BJJ - No Gi - Intermediate" },
      { day:"Do", time:"07:30", end:"08:30", cls:"Kickboxing - Bagtraining" },
      { day:"Do", time:"07:30", end:"08:30", cls:"Strength & Conditioning" },
      { day:"Do", time:"08:00", end:"09:30", cls:"BJJ / Grappling - No Gi - All levels" },
      { day:"Do", time:"08:30", end:"09:30", cls:"Boxing - Bagtraining" },
      { day:"Do", time:"12:00", end:"13:00", cls:"Kickboxing - All levels" },
      { day:"Do", time:"17:30", end:"18:30", cls:"Kickboxing - Bagtraining" },
      { day:"Do", time:"18:00", end:"19:00", cls:"Boxing - Beginners" },
      { day:"Do", time:"18:00", end:"19:00", cls:"Strength & Conditioning" },
      { day:"Do", time:"18:30", end:"19:30", cls:"Kickboxing - Bagtraining" },
      { day:"Do", time:"19:00", end:"20:00", cls:"Boxing - Advanced" },
      { day:"Do", time:"19:00", end:"20:00", cls:"HYROX" },
      { day:"Do", time:"19:30", end:"20:30", cls:"Kickboxing - Bagtraining" },
      { day:"Do", time:"20:30", end:"22:00", cls:"BJJ / Grappling - All levels (With Gi)" },
      { day:"Vr", time:"08:30", end:"09:30", cls:"Strength & Conditioning" },
      { day:"Vr", time:"08:30", end:"09:30", cls:"Kickboxing - Bagtraining" },
      { day:"Vr", time:"09:30", end:"10:30", cls:"Boxing - Bagtraining" },
      { day:"Vr", time:"11:00", end:"12:00", cls:"Kickboxing - All levels" },
      { day:"Vr", time:"16:00", end:"17:00", cls:"Kickboxing Youth 6-12" },
      { day:"Vr", time:"17:00", end:"18:00", cls:"Kickboxing Youth 12-17" },
      { day:"Vr", time:"17:30", end:"18:30", cls:"Kickboxing - Bagtraining" },
      { day:"Vr", time:"18:00", end:"19:00", cls:"Muay Thai - All levels" },
      { day:"Vr", time:"18:30", end:"19:30", cls:"Boxing - Bagtraining" },
      { day:"Za", time:"09:00", end:"10:00", cls:"Powerlifting" },
      { day:"Za", time:"10:00", end:"11:00", cls:"Strength & Conditioning" },
      { day:"Za", time:"10:30", end:"11:30", cls:"Kickboxing - Bagtraining" },
      { day:"Za", time:"10:30", end:"11:30", cls:"Boxing - All levels" },
      { day:"Za", time:"11:00", end:"12:00", cls:"Strength" },
      { day:"Za", time:"11:30", end:"12:30", cls:"Kickboxing - All levels" },
      { day:"Za", time:"11:30", end:"12:30", cls:"Boxing - Bagtraining" },
      { day:"Za", time:"12:30", end:"14:00", cls:"BJJ / Grappling - Beginners (No Gi)" },
      { day:"Za", time:"12:30", end:"13:30", cls:"Sparring boxing / kickboxing" },
      { day:"Zo", time:"10:00", end:"11:00", cls:"Strength & Conditioning" },
      { day:"Zo", time:"10:30", end:"11:30", cls:"Ladies (Kick)boxing - Intermediate" },
      { day:"Zo", time:"10:30", end:"11:30", cls:"Boxing - Bagtraining" },
      { day:"Zo", time:"11:00", end:"12:00", cls:"HYROX" },
      { day:"Zo", time:"11:30", end:"12:30", cls:"Kickboxing - All levels" },
      { day:"Zo", time:"12:30", end:"13:30", cls:"Kickboxing - Bagtraining" },
      { day:"Zo", time:"13:30", end:"14:30", cls:"BJJ / Grappling - All levels (With Gi)" },
      { day:"Zo", time:"14:30", end:"15:30", cls:"BJJ / Grappling - Open mat" },
    ],
  },
  { id: 3, name: "Bensy Gym", isAtc: false, schedule: [] },
  { id: 4, name: "El Otmani Gym", isAtc: false, schedule: [] },
  { id: 5, name: "Elite Training Center", isAtc: false, schedule: [
    { day:"Ma", time:"19:00", end:"20:00", cls:"Boksen" },
    { day:"Di", time:"19:00", end:"20:00", cls:"Ladies Only Full Body Kickboksen" },
    { day:"Di", time:"19:00", end:"20:00", cls:"Kickboksen Gevorderd" },
    { day:"Wo", time:"17:00", end:"18:00", cls:"t/m 11 jaar Kickboksen Jeugd" },
    { day:"Wo", time:"18:00", end:"19:00", cls:"12 t/m 14 jaar Kickboksen Jeugd" },
    { day:"Wo", time:"19:00", end:"20:00", cls:"Techniekles Kickboksen" },
    { day:"Wo", time:"20:00", end:"21:00", cls:"MMA" },
    { day:"Do", time:"19:00", end:"20:00", cls:"Ladies Only Zak- en Conditie" },
    { day:"Vr", time:"17:00", end:"18:00", cls:"8 t/m 11 jaar Kickboksen Jeugd" },
    { day:"Vr", time:"18:00", end:"19:00", cls:"12 t/m 14 jaar Kickboksen Jeugd" },
    { day:"Vr", time:"19:00", end:"20:00", cls:"Techniekles Kickboksen" },
    { day:"Za", time:"10:00", end:"11:00", cls:"Zak- en Conditietraining" },
    { day:"Zo", time:"12:00", end:"13:30", cls:"MMA" },
], },
  { id: 6, name: "EttakiGym", isAtc: false, 
    schedule: [
    { day:"Ma", time:"11:00", end:"11:50", cls:"Zaktraining" },
    { day:"Ma", time:"18:00", end:"18:50", cls:"Zaktraining" },
    { day:"Ma", time:"19:00", end:"19:50", cls:"Kickboks techniek training" },
    { day:"Ma", time:"20:00", end:"20:50", cls:"Zaktraining" },
    { day:"Di", time:"11:00", end:"11:50", cls:"Zaktraining" },
    { day:"Di", time:"16:00", end:"16:50", cls:"Jeugd kickboksen 6 t/m 10 jaar" },
    { day:"Di", time:"17:00", end:"17:50", cls:"Jeugd kickboksen 11 t/m 15 jaar" },
    { day:"Di", time:"18:00", end:"18:50", cls:"Zaktraining" },
    { day:"Di", time:"19:00", end:"19:50", cls:"Kickboks techniek training" },
    { day:"Di", time:"20:00", end:"20:50", cls:"Zaktraining" },
    { day:"Wo", time:"11:00", end:"11:50", cls:"Zaktraining" },
    { day:"Wo", time:"18:00", end:"18:50", cls:"Zaktraining" },
    { day:"Wo", time:"19:00", end:"19:50", cls:"Kickboks techniek training" },
    { day:"Wo", time:"20:00", end:"20:50", cls:"Zaktraining" },
    { day:"Do", time:"11:00", end:"11:50", cls:"Zaktraining" },
    { day:"Do", time:"16:00", end:"16:50", cls:"Jeugd kickboksen 6 t/m 10 jaar" },
    { day:"Do", time:"17:00", end:"17:50", cls:"Jeugd kickboksen 11 t/m 15 jaar" },
    { day:"Do", time:"18:00", end:"18:50", cls:"Zaktraining" },
    { day:"Do", time:"19:00", end:"19:50", cls:"Zaktraining" },
    { day:"Vr", time:"11:00", end:"11:50", cls:"Zaktraining" },
    { day:"Vr", time:"18:00", end:"18:50", cls:"Zaktraining" },
    { day:"Vr", time:"19:00", end:"19:50", cls:"Kickboks techniek training" },
    { day:"Za", time:"10:00", end:"10:50", cls:"Zaktraining" },
    { day:"Za", time:"11:00", end:"11:50", cls:"Zaktraining" },
    { day:"Za", time:"12:00", end:"12:50", cls:"Spartraining voor alle niveaus" },
    { day:"Zo", time:"10:00", end:"10:50", cls:"Zaktraining" },
    { day:"Zo", time:"11:00", end:"11:50", cls:"Zaktraining" },
  ],
 },
  { id: 7, name: "FIGHT DISTRICT", isAtc: false, schedule: [
    { day:"Ma", time:"12:00", end:"13:00", cls:"Heavy Bag Combo Technique" },
    { day:"Ma", time:"16:00", end:"17:00", cls:"Fight Youth" },
    { day:"Ma", time:"17:30", end:"18:30", cls:"Heavy Bag Combo Technique" },
    { day:"Ma", time:"17:45", end:"18:30", cls:"Strength and Conditioning Training" },
    { day:"Ma", time:"18:30", end:"19:30", cls:"Boxing Advanced" },
    { day:"Ma", time:"18:30", end:"19:30", cls:"Boxing Beginners" },
    { day:"Ma", time:"18:30", end:"19:30", cls:"Heavy Bag Combo Technique" },
    { day:"Ma", time:"19:30", end:"20:30", cls:"Kickboxing Advanced" },
    { day:"Ma", time:"19:30", end:"20:30", cls:"Fight Team Invite Only" },
    { day:"Di", time:"07:45", end:"08:30", cls:"Heavy Bag Combo Technique" },
    { day:"Di", time:"08:30", end:"09:30", cls:"Heavy Bag Combo Technique" },
    { day:"Di", time:"10:15", end:"11:15", cls:"Kickboxing" },
    { day:"Di", time:"17:30", end:"18:30", cls:"Kickboxing Beginners" },
    { day:"Di", time:"18:00", end:"19:00", cls:"Strength and Conditioning Training" },
    { day:"Di", time:"18:30", end:"19:30", cls:"Heavy Bag Combo Technique" },
    { day:"Di", time:"18:45", end:"19:45", cls:"Boxing Advanced" },
    { day:"Di", time:"18:45", end:"19:45", cls:"Boxing Beginners" },
    { day:"Di", time:"19:45", end:"20:45", cls:"Altitude Fight Conditioning" },
    { day:"Wo", time:"07:30", end:"08:15", cls:"Heavy Bag Combo Technique" },
    { day:"Wo", time:"08:15", end:"09:00", cls:"Strength and Conditioning Training" },
    { day:"Wo", time:"09:00", end:"10:00", cls:"Heavy Bag Conditioning" },
    { day:"Wo", time:"10:15", end:"11:15", cls:"Kickboxing" },
    { day:"Wo", time:"12:15", end:"13:15", cls:"Heavy Bag Conditioning" },
    { day:"Wo", time:"16:00", end:"17:00", cls:"Fight Youth" },
    { day:"Wo", time:"17:30", end:"18:30", cls:"Boxing" },
    { day:"Wo", time:"17:30", end:"18:30", cls:"Heavy Bag Conditioning" },
    { day:"Wo", time:"17:45", end:"18:30", cls:"Strength and Conditioning Training" },
    { day:"Wo", time:"18:30", end:"19:30", cls:"Sparren" },
    { day:"Wo", time:"19:30", end:"20:30", cls:"Boxing Beginners" },
    { day:"Wo", time:"19:30", end:"20:30", cls:"Kickboxing Beginners" },
    { day:"Do", time:"07:00", end:"07:45", cls:"Heavy Bag Combo Technique" },
    { day:"Do", time:"07:45", end:"08:45", cls:"Kicking Technique Training" },
    { day:"Do", time:"09:00", end:"10:00", cls:"Strength and Conditioning Training" },
    { day:"Do", time:"10:15", end:"11:15", cls:"Kickboxing" },
    { day:"Do", time:"18:00", end:"19:00", cls:"Heavy Bag Combo Technique" },
    { day:"Do", time:"18:00", end:"19:00", cls:"Altitude Fight Conditioning" },
    { day:"Do", time:"18:30", end:"19:30", cls:"Boxing Advanced" },
    { day:"Vr", time:"07:30", end:"08:30", cls:"Heavy Bag Combo Technique" },
    { day:"Vr", time:"09:00", end:"10:00", cls:"Strength and Conditioning Training" },
    { day:"Vr", time:"12:15", end:"13:15", cls:"Heavy Bag Combo Technique" },
    { day:"Vr", time:"16:00", end:"17:00", cls:"Fight Youth" },
    { day:"Vr", time:"17:30", end:"18:30", cls:"Kickboxing" },
    { day:"Za", time:"10:00", end:"11:00", cls:"Heavy Bag Combo Technique" },
    { day:"Za", time:"11:00", end:"12:00", cls:"Boxing" },
    { day:"Za", time:"11:00", end:"12:00", cls:"Kickboxing Advanced" },
    { day:"Zo", time:"10:00", end:"11:00", cls:"Heavy Bag Combo Technique" },
    { day:"Zo", time:"10:00", end:"11:00", cls:"Kickboxing" },
    { day:"Zo", time:"11:00", end:"12:00", cls:"Boxing Technique" },
    { day:"Zo", time:"11:00", end:"12:00", cls:"Heavy Bag Combo Technique" },
  ],
 },
  { id: 8, name: "Fight IQ", isAtc: false, schedule: [
    { day:"Ma", time:"12:00", end:"13:00", cls:"MMA Class" },
    { day:"Ma", time:"16:00", end:"17:00", cls:"Self-Defence MMA for Kids" },
    { day:"Ma", time:"17:00", end:"18:00", cls:"Self-Defence MMA for Youth" },
    { day:"Ma", time:"18:00", end:"19:00", cls:"Kickboxing & Wrestling" },
    { day:"Ma", time:"19:00", end:"20:00", cls:"MMA Class" },
    { day:"Di", time:"11:00", end:"12:00", cls:"Kickboxing Sparring" },
    { day:"Di", time:"12:00", end:"13:30", cls:"All Levels" },
    { day:"Di", time:"19:00", end:"20:30", cls:"No-Gi BJJ" },
    { day:"Wo", time:"12:00", end:"13:00", cls:"MMA Class" },
    { day:"Wo", time:"18:00", end:"19:00", cls:"Kickboxing" },
    { day:"Do", time:"11:00", end:"12:00", cls:"Kickboxing Sparring" },
    { day:"Do", time:"16:00", end:"17:00", cls:"Self-Defence MMA for Kids" },
    { day:"Do", time:"17:00", end:"18:00", cls:"Self-Defence MMA for Youth" },
    { day:"Do", time:"18:00", end:"19:00", cls:"No-Gi Judo, Wrestling & Grappling" },
    { day:"Do", time:"19:00", end:"20:00", cls:"No-Gi BJJ" },
    { day:"Vr", time:"11:00", end:"12:00", cls:"No-Gi Judo, Wrestling & Grappling" },
    { day:"Vr", time:"12:00", end:"13:00", cls:"MMA Class" },
    { day:"Vr", time:"18:00", end:"19:00", cls:"Kickboxing" },
    { day:"Vr", time:"19:00", end:"20:00", cls:"No-Gi BJJ" },
    { day:"Za", time:"12:00", end:"13:00", cls:"Inter-Gym Sparring" },
  ],
 },
 { id: 4, name: "Southpaw", isAtc: false,
  schedule: [
  { day:"Ma", time:"10:00", end:"11:00", cls:"Comprehensive Kickboxing & Strength" },
  { day:"Ma", time:"18:00", end:"19:00", cls:"Kickboxing Fundamentals" },
  { day:"Ma", time:"19:00", end:"20:00", cls:"Light Sparring for Amateurs" },
  { day:"Di", time:"10:00", end:"11:00", cls:"Comprehensive Kickboxing & Strength" },
  { day:"Di", time:"17:00", end:"18:00", cls:"Junior Champions Kickboxing" },
  { day:"Di", time:"18:00", end:"19:00", cls:"Competitive Fight Group" },
  { day:"Di", time:"19:00", end:"20:00", cls:"Traditional Kickboxing" },
  { day:"Wo", time:"10:00", end:"11:00", cls:"Comprehensive Kickboxing & Strength" },
  { day:"Wo", time:"18:00", end:"19:00", cls:"Kickboxing Fundamentals" },
  { day:"Do", time:"10:00", end:"11:00", cls:"Comprehensive Kickboxing & Strength" },
  { day:"Do", time:"17:00", end:"18:00", cls:"Junior Champions Kickboxing" },
  { day:"Do", time:"18:00", end:"19:00", cls:"Competitive Fight Group" },
  { day:"Do", time:"19:00", end:"20:00", cls:"Traditional Kickboxing" },
  { day:"Vr", time:"10:00", end:"11:00", cls:"Comprehensive Kickboxing & Strength" },
  { day:"Vr", time:"18:00", end:"19:00", cls:"Competitive Fight Group" },
  { day:"Vr", time:"19:00", end:"20:00", cls:"Traditional Kickboxing" },
  { day:"Zo", time:"18:00", end:"19:00", cls:"Competitive Fight Group" },
  { day:"Zo", time:"19:00", end:"20:00", cls:"Traditional Kickboxing" },
],
},

{ id: 5, name: "KOPS", isAtc: false,
  schedule: [
  { day:"Ma", time:"18:00", end:"19:00", cls:"Kickboksen" },
  { day:"Ma", time:"19:00", end:"20:00", cls:"Boksconditie" },
  { day:"Ma", time:"20:00", end:"21:30", cls:"Worstelen" },
  { day:"Di", time:"12:00", end:"13:00", cls:"Boksconditie" },
  { day:"Di", time:"16:30", end:"17:15", cls:"Jeugd Kickboksen (6-10 jaar)" },
  { day:"Di", time:"17:15", end:"18:00", cls:"Jeugd Kickboksen (10-15 jaar)" },
  { day:"Di", time:"18:00", end:"19:00", cls:"Kickboksen" },
  { day:"Di", time:"20:00", end:"21:30", cls:"Boksen" },
  { day:"Wo", time:"17:00", end:"18:00", cls:"Jeugd Worstelen" },
  { day:"Wo", time:"18:00", end:"19:00", cls:"Kickboksen" },
  { day:"Wo", time:"19:00", end:"20:30", cls:"MMA Worstelen / Grappling" },
  { day:"Wo", time:"20:30", end:"21:30", cls:"Boksconditie" },
  { day:"Do", time:"18:00", end:"19:00", cls:"Kickboksen" },
  { day:"Do", time:"20:00", end:"21:30", cls:"Boksen" },
  { day:"Vr", time:"12:00", end:"13:00", cls:"Kickboksen" },
  { day:"Vr", time:"16:30", end:"17:15", cls:"Jeugd Kickboksen (6-10 jaar)" },
  { day:"Vr", time:"17:15", end:"18:00", cls:"Jeugd Kickboksen (10-15 jaar)" },
  { day:"Vr", time:"18:00", end:"19:00", cls:"Jeugd Worstelen" },
  { day:"Vr", time:"19:00", end:"20:00", cls:"Boksconditie" },
  { day:"Vr", time:"20:00", end:"21:30", cls:"Worstelen" },
  { day:"Za", time:"13:30", end:"14:30", cls:"Boksconditie" },
],
},

{ id: 6, name: "Martial Arts Center Amsterdam", isAtc: false,
  schedule: [
  { day:"Ma", time:"09:00", end:"10:00", cls:"Zaktraining Kickboksen" },
  { day:"Ma", time:"15:30", end:"16:30", cls:"Kickboksen voor Meiden" },
  { day:"Ma", time:"16:30", end:"17:30", cls:"Kickboksen voor Meiden" },
  { day:"Ma", time:"17:30", end:"18:30", cls:"Zaktraining Kickboksen" },
  { day:"Ma", time:"18:30", end:"19:30", cls:"Zaktraining Kickboksen" },
  { day:"Di", time:"09:00", end:"10:00", cls:"Circuit Training" },
  { day:"Di", time:"16:30", end:"17:30", cls:"Kickboksen voor Meiden" },
  { day:"Di", time:"17:30", end:"18:30", cls:"Circuit Training" },
  { day:"Wo", time:"09:00", end:"10:00", cls:"Zaktraining en BBB" },
  { day:"Wo", time:"16:30", end:"17:30", cls:"Kickboksen voor Meiden" },
  { day:"Wo", time:"17:30", end:"18:30", cls:"Zaktraining en BBB Pro" },
  { day:"Wo", time:"18:30", end:"19:30", cls:"Circuit Training Beginners" },
  { day:"Wo", time:"19:30", end:"20:30", cls:"Zaktraining Kickboksen" },
  { day:"Do", time:"09:00", end:"10:00", cls:"Circuit Training" },
  { day:"Do", time:"15:30", end:"16:30", cls:"Kickboksen voor Meiden" },
  { day:"Do", time:"16:30", end:"17:30", cls:"Kickboksen voor Meiden" },
  { day:"Do", time:"17:30", end:"18:30", cls:"Zaktraining Kickboksen" },
  { day:"Do", time:"18:30", end:"19:30", cls:"Zaktraining en BBB" },
  { day:"Vr", time:"09:00", end:"10:00", cls:"Zelftraining" },
  { day:"Vr", time:"16:30", end:"17:30", cls:"Kickboksen voor Meiden" },
  { day:"Vr", time:"17:30", end:"18:30", cls:"Zaktraining Kickboksen" },
  { day:"Vr", time:"18:30", end:"19:30", cls:"Circuit Training" },
  { day:"Za", time:"10:00", end:"11:00", cls:"Zaktraining Kickboksen Beginners" },
  { day:"Zo", time:"09:30", end:"10:30", cls:"Zaktraining Kickboksen" },
  { day:"Zo", time:"10:30", end:"11:30", cls:"Zaktraining en BBB" },
],
},

{ id: 7, name: "MOUSID GYM", isAtc: false,
  schedule: [
  { day:"Ma", time:"18:00", end:"19:00", cls:"Jeugd tot 14 jaar" },
  { day:"Ma", time:"19:00", end:"20:00", cls:"Kickboks alle leeftijden" },
  { day:"Ma", time:"20:15", end:"21:15", cls:"Zaktraining alle leeftijden" },
  { day:"Di", time:"11:30", end:"12:30", cls:"Zaktraining alle leeftijden" },
  { day:"Di", time:"18:30", end:"19:30", cls:"Ladies Only jeugd tot 16" },
  { day:"Di", time:"19:30", end:"20:30", cls:"Ladies Only 16 jaar en ouder Kickboksen" },
  { day:"Wo", time:"18:00", end:"19:00", cls:"Jeugd tot 14 jaar" },
  { day:"Wo", time:"19:00", end:"20:00", cls:"Kickboks alle leeftijden" },
  { day:"Do", time:"11:30", end:"12:30", cls:"Zaktraining alle leeftijden" },
  { day:"Do", time:"18:30", end:"19:30", cls:"Ladies Only jeugd tot 16 Kickboksen" },
  { day:"Do", time:"19:30", end:"20:30", cls:"Ladies Only 16 jaar en ouder Kickboksen" },
  { day:"Vr", time:"18:00", end:"19:00", cls:"Jeugd tot 14 jaar" },
  { day:"Vr", time:"19:00", end:"20:00", cls:"Kickboks alle leeftijden" },
  { day:"Vr", time:"20:15", end:"21:15", cls:"Zaktraining alle leeftijden" },
  { day:"Za", time:"14:30", end:"15:30", cls:"Zaktraining alle leeftijden" },
  { day:"Zo", time:"12:00", end:"13:00", cls:"Ladies Only jeugd tot 16 jaar" },
  { day:"Zo", time:"13:00", end:"14:00", cls:"Ladies Only 16 jaar en ouder Kickboksen" },
],
},

{ id: 8, name: "Patrick's Gym", isAtc: false,
  schedule: [
  { day:"Ma", time:"11:00", end:"12:00", cls:"Muay Thai Heavybag" },
  { day:"Ma", time:"17:00", end:"18:00", cls:"Boxing Only" },
  { day:"Ma", time:"18:00", end:"18:45", cls:"Muay Thai Heavybag" },
  { day:"Ma", time:"18:00", end:"19:00", cls:"Boxing & Strength" },
  { day:"Ma", time:"18:45", end:"19:30", cls:"Muay Thai Heavybag" },
  { day:"Ma", time:"19:00", end:"19:45", cls:"Strength & Conditioning Small Group" },
  { day:"Ma", time:"19:30", end:"20:30", cls:"Muay Thai Technique" },
  { day:"Ma", time:"20:00", end:"21:00", cls:"HYROX (Strength)" },
  { day:"Di", time:"07:00", end:"07:45", cls:"Strength & Conditioning Small Group" },
  { day:"Di", time:"11:00", end:"12:00", cls:"Kickboxing Heavybag" },
  { day:"Di", time:"16:30", end:"17:30", cls:"Muay Thai Technique Beginners" },
  { day:"Di", time:"17:30", end:"18:30", cls:"Boxing Only" },
  { day:"Di", time:"18:00", end:"19:00", cls:"HYROX (Simulation)" },
  { day:"Di", time:"18:30", end:"19:15", cls:"Kickboxing Heavybag" },
  { day:"Di", time:"19:00", end:"19:45", cls:"Strength & Conditioning Small Group" },
  { day:"Di", time:"19:15", end:"20:00", cls:"Kickboxing Heavybag" },
  { day:"Di", time:"20:00", end:"21:00", cls:"Kickboxing Technique" },
  { day:"Wo", time:"07:00", end:"08:00", cls:"Muay Thai Heavybag" },
  { day:"Wo", time:"09:00", end:"10:00", cls:"Strength & Conditioning Small Group" },
  { day:"Wo", time:"11:00", end:"12:00", cls:"Muay Thai Heavybag" },
  { day:"Wo", time:"16:00", end:"16:45", cls:"Kids Thaiboxing 5–8 yrs" },
  { day:"Wo", time:"16:45", end:"17:30", cls:"Kids Thaiboxing 8–13 yrs" },
  { day:"Wo", time:"17:30", end:"18:15", cls:"Muay Thai Heavybag" },
  { day:"Wo", time:"18:00", end:"18:45", cls:"Booty & Abs" },
  { day:"Wo", time:"18:15", end:"19:00", cls:"Muay Thai Heavybag" },
  { day:"Wo", time:"18:45", end:"19:30", cls:"Strength & Conditioning Small Group" },
  { day:"Wo", time:"19:00", end:"20:00", cls:"Muay Thai Technique" },
  { day:"Do", time:"07:00", end:"07:45", cls:"HYROX (Strength)" },
  { day:"Do", time:"17:30", end:"18:30", cls:"Boxing Only" },
  { day:"Do", time:"18:00", end:"19:00", cls:"Booty Circuit" },
  { day:"Do", time:"18:30", end:"19:15", cls:"Kickboxing Heavybag" },
  { day:"Do", time:"19:00", end:"20:00", cls:"Strength & Conditioning Small Group" },
  { day:"Do", time:"19:15", end:"20:00", cls:"Kickboxing Heavybag" },
  { day:"Do", time:"20:00", end:"21:00", cls:"Kickboxing Technique" },
  { day:"Do", time:"20:00", end:"21:00", cls:"HYROX (Allround)" },
  { day:"Vr", time:"07:00", end:"07:45", cls:"Strength & Conditioning Small Group" },
  { day:"Vr", time:"10:00", end:"11:00", cls:"Muay Thai Technique" },
  { day:"Vr", time:"11:00", end:"12:00", cls:"Muay Thai Heavybag" },
  { day:"Vr", time:"11:00", end:"11:45", cls:"Strength & Conditioning Small Group" },
  { day:"Vr", time:"12:00", end:"13:00", cls:"Boxing Only" },
  { day:"Za", time:"09:00", end:"09:45", cls:"Kids Thaiboxing 5–8 yrs" },
  { day:"Za", time:"09:00", end:"10:00", cls:"Mobility Training" },
  { day:"Za", time:"09:45", end:"10:30", cls:"Kids Thaiboxing 8–13 yrs" },
  { day:"Za", time:"10:00", end:"11:00", cls:"Booty Circuit" },
  { day:"Za", time:"10:30", end:"11:30", cls:"Muay Thai Heavybag" },
  { day:"Za", time:"11:00", end:"12:00", cls:"Strength & Conditioning Small Group" },
  { day:"Za", time:"11:30", end:"12:30", cls:"Muay Thai Technique" },
  { day:"Za", time:"12:30", end:"13:30", cls:"Boxing Only" },
  { day:"Zo", time:"10:00", end:"11:00", cls:"Muay Thai Technique" },
  { day:"Zo", time:"10:00", end:"11:00", cls:"Core Strength" },
  { day:"Zo", time:"11:00", end:"12:00", cls:"Muay Thai Heavybag" },
  { day:"Zo", time:"11:00", end:"12:00", cls:"Strength & Conditioning Small Group" },
  { day:"Zo", time:"12:00", end:"13:00", cls:"HYROX (Allround)" },
  { day:"Zo", time:"12:15", end:"13:15", cls:"Ladies Only Kickboxing" },
],
},
  { id: 14, name: "Royal Gym Amsterdam", isAtc: false, schedule: [] },
  { id: 15, name: "Sin City Boxing", isAtc: false, schedule: [] },
  { id: 16, name: "Sport city", isAtc: false, schedule: [] },
];

// ─── OPEN GYM TIJDEN ─────────────────────────────────────────────────────────

const openGymData = [
  {
    id: 0, name: "ATC", isAtc: true,
    hours: [
      { day:"Ma", slots:[{ from:"07:00", to:"09:00" }, { from:"10:30", to:"14:00" }, { from:"17:00", to:"22:30" }] },
      { day:"Di", slots:[{ from:"10:00", to:"14:00" }, { from:"16:45", to:"22:30" }] },
      { day:"Wo", slots:[{ from:"07:00", to:"09:00" }, { from:"17:00", to:"22:30" }] },
      { day:"Do", slots:[{ from:"10:00", to:"14:00" }, { from:"16:45", to:"22:30" }] },
      { day:"Vr", slots:[{ from:"07:00", to:"08:30" }, { from:"12:00", to:"13:30" }, { from:"17:00", to:"22:30" }] },
      { day:"Za", slots:[{ from:"11:00", to:"15:00" }] },
      { day:"Zo", slots:[{ from:"11:30", to:"15:00" }] },
    ],
  },
  {
    id: 1, name: "Gym Royale", isAtc: false,
    hours: [
      { day:"Ma", slots:[{ from:"09:00", to:"13:00" }] },
      { day:"Di", slots:[{ from:"09:00", to:"13:00" }] },
      { day:"Wo", slots:[{ from:"09:00", to:"11:00" }] },
      { day:"Do", slots:[{ from:"09:00", to:"13:00" }] },
      { day:"Vr", slots:[{ from:"09:00", to:"12:00" }, { from:"16:00", to:"18:00" }] },
    ],
  },
  {
    id: 2, name: "Eastbound Gym", isAtc: false,
    hours: [
      { day:"Ma", slots:[{ from:"07:00", to:"13:30" }, { from:"16:00", to:"22:00" }] },
      { day:"Di", slots:[{ from:"07:30", to:"13:30" }, { from:"16:00", to:"22:00" }] },
      { day:"Wo", slots:[{ from:"07:30", to:"13:30" }, { from:"15:00", to:"22:00" }] },
      { day:"Do", slots:[{ from:"07:30", to:"13:30" }, { from:"16:00", to:"22:00" }] },
      { day:"Vr", slots:[{ from:"08:00", to:"13:30" }, { from:"16:00", to:"20:30" }] },
      { day:"Za", slots:[{ from:"09:00", to:"14:00" }] },
      { day:"Zo", slots:[{ from:"09:45", to:"15:30" }] },
    ],
  },
  { id: 3, name: "Bensy Gym", isAtc: false, hours: [] },
  { id: 4, name: "El Otmani Gym", isAtc: false, hours: [] },
  { id: 5, name: "Elite Training Center", isAtc: false, hours: [] },
  { id: 6, name: "EttakiGym", isAtc: false, hours: [] },
  { id: 7, name: "FIGHT DISTRICT", isAtc: false, hours: [] },
  { id: 8, name: "Fight IQ", isAtc: false, hours: [] },
  { id: 9, name: "Gym Southpaw", isAtc: false, hours: [] },
  { id: 10, name: "Kops Gym", isAtc: false, hours: [] },
  { id: 11, name: "Martial Arts Center Amsterdam", isAtc: false, hours: [] },
  { id: 12, name: "MOUSID GYM", isAtc: false, hours: [] },
  { id: 13, name: "Patrick's Gym", isAtc: false, hours: [] },
  { id: 14, name: "Royal Gym Amsterdam", isAtc: false, hours: [] },
  { id: 15, name: "Sin City Boxing", isAtc: false, hours: [] },
  { id: 16, name: "Sport city", isAtc: false, hours: [] },
];

// Sort gyms alphabetically and reassign ids so colors stay consistent
const gymsSorted = [...gyms].sort((a,b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" })).map((g,i) => ({ ...g, id: i }));
const openGymDataSorted = [...openGymData].sort((a,b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" })).map((g,i) => ({ ...g, id: i }));

const ETTaki_YELLOW = "#ffb703";
const isEttaki = (gym) => gym?.name?.toLowerCase() === "ettakigym";
const gymAccent = (gym, fallback) => (isEttaki(gym) ? ETTaki_YELLOW : fallback);
const gymNameColor = (gym, fallback) => (gym.isAtc ? "#E63946" : (isEttaki(gym) ? ETTaki_YELLOW : fallback));

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const tmin = t => { const [h,m] = t.split(":").map(Number); return h*60+m; };
const tdur = (s,e) => tmin(e) - tmin(s);
const fmtH = mins => {
  const h = Math.floor(mins/60), m = mins%60;
  return m === 0 ? `${h}u` : `${h}u${m}m`;
};
const getCat = cls => {
  const low = cls.toLowerCase();
  return CATEGORIES.find(c => c.keywords.some(k => low.includes(k))) || CATEGORIES[CATEGORIES.length-1];
};
const isOpenGym = cls => cls.toLowerCase().includes("open gym");

const LABEL_BASE = { fontSize:9,fontWeight:700,letterSpacing:"1.8px",textTransform:"uppercase" };
const getLabel = (T) => ({ ...LABEL_BASE, color: T.textMuted });
const TH_BASE = { padding:"8px 12px",fontSize:9,fontWeight:700,letterSpacing:"1.2px",textTransform:"uppercase",
                  position:"sticky",top:0,zIndex:1,whiteSpace:"nowrap" };
const getTH = (T) => ({ ...TH_BASE, background: T.bg, color: T.textMuted, borderBottom: `1px solid ${T.border}` });
const getCard = (T) => ({ background: T.surface, border: `1px solid ${T.border2}`, borderRadius: 12 });

function GymTag({ gym }) {
  return <>{gym.name}</>;
}

// ─── VIEW: PER DAG ────────────────────────────────────────────────────────────

function DagView({ visibleGyms, day, setDay, activeCats, theme }) {
  const T = theme || DARK_THEME;
  const catOn = (cls) => activeCats.includes(getCat(cls).key);
  const cfd = (gym,d) =>
    gym.schedule
      .filter(s=>s.day===d && !isOpenGym(s.cls) && catOn(s.cls))
      .sort((a,b)=>tmin(a.time)-tmin(b.time));
  const CARD = getCard(T);
  return <>
    <div style={{ display:"flex",gap:3,marginBottom:18,flexWrap:"wrap" }}>
      {DAYS.map(d => (
        <button key={d} onClick={()=>setDay(d)} style={{
          width:38,height:38,borderRadius:8,fontSize:11,fontWeight:700,border:"none",
          background:day===d?T.btnBgA:"transparent",
          color:day===d?"#fff":T.textMuted,
          outline:day===d?`1px solid ${T.border2}`:"none",transition:"all .15s",
        }}>{d}</button>
      ))}
    </div>
    <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(255px,1fr))",gap:12 }}>
      {visibleGyms.map(gym => {
        const col = gymAccent(gym, PALETTE[gym.id]||"#888");
        const cls = cfd(gym, day);
        return (
          <div key={gym.id} style={CARD}>
            <div style={{ padding:"10px 14px",borderBottom:`1px solid ${T.border}`,
              display:"flex",alignItems:"center",gap:8 }}>
              <div style={{ width:3,height:28,borderRadius:2,background:col,flexShrink:0 }}/>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:12,fontWeight:700,color:gymNameColor(gym, T.textSub) }}>
                  <GymTag gym={gym}/>
                </div>
                <div style={{ fontSize:10,color:T.textMuted,marginTop:1 }}>
                  {cls.length} lessen · {fmtH(cls.reduce((a,c)=>a+tdur(c.time,c.end),0))}
                </div>
              </div>
              <div style={{ fontSize:18,fontWeight:800,color:col }}>{cls.length}</div>
            </div>
            <div style={{ padding:"8px 12px" }}>
              {gym.schedule.length===0
                ? <div style={{ textAlign:"center",padding:"14px 0",fontSize:11,color:T.textMuted }}>Nog geen schema</div>
                : cls.length===0
                ? <div style={{ textAlign:"center",padding:"14px 0",fontSize:11,color:T.textMuted }}>Geen lessen</div>
                : cls.map((c,j) => {
                    const cat = getCat(c.cls);
                    return <div key={j} style={{ padding:"6px 10px",borderRadius:6,background:T.row,
                      border:`1px solid ${T.border}`,marginBottom:4,display:"flex",
                      justifyContent:"space-between",alignItems:"center" }}>
                      <div>
                        <div style={{ fontSize:11,fontWeight:600,color:T.textSub }}>{c.cls}</div>
                        <span style={{ fontSize:9,padding:"1px 5px",borderRadius:3,
                          background:`${cat.color}18`,color:cat.color,fontWeight:600 }}>{cat.label}</span>
                      </div>
                      <div style={{ fontSize:10,color:T.textMuted,marginLeft:8,flexShrink:0,textAlign:"right" }}>
                        <div>{c.time}–{c.end}</div>
                        <div>{tdur(c.time,c.end)}m</div>
                      </div>
                    </div>;
                  })
              }
            </div>
          </div>
        );
      })}
    </div>
  </>;
}

// ─── VIEW: WEEKOVERZICHT ─────────────────────────────────────────────────────

function WeekView({ visibleGyms, activeCats, theme }) {
  const T = theme || DARK_THEME;
  const catOn = (cls) => activeCats.includes(getCat(cls).key);
  const TH = getTH(T);
  const CARD = getCard(T);
  const LABEL = getLabel(T);
  const cfd = (gym,d) =>
    gym.schedule
      .filter(s=>s.day===d && !isOpenGym(s.cls) && catOn(s.cls))
      .sort((a,b)=>tmin(a.time)-tmin(b.time));

  const gymStats = useMemo(() => visibleGyms.map(gym => {
    const catMins = Object.fromEntries(CATEGORIES.map(c=>[c.key,0]));
    let totalMins = 0;
    for (const s of gym.schedule) {
      if (isOpenGym(s.cls)) continue;
      if (!catOn(s.cls)) continue;
      const dur = tdur(s.time,s.end);
      catMins[getCat(s.cls).key] += dur;
      totalMins += dur;
    }
    return { gym, catMins, totalMins };
  }), [visibleGyms, activeCats]);

  const maxPerDay = useMemo(() =>
    Math.max(...DAYS.map(d => Math.max(...visibleGyms.map(g => cfd(g,d).length),0)),1),
  [visibleGyms, activeCats]);

  const maxMins = Math.max(...gymStats.map(s=>s.totalMins),1);

  return (
    <div style={{ display:"flex",flexDirection:"column",gap:16 }}>

      {/* Heatmap */}
      <div style={CARD}>
        <div style={{ padding:"16px 20px 12px",borderBottom:`1px solid ${T.border}` }}>
          <div style={LABEL}>Lessen per dag</div>
        </div>
        <div style={{ overflowX:"auto",padding:"0 0 4px" }}>
          <table style={{ width:"100%",borderCollapse:"collapse",minWidth:500 }}>
            <thead><tr>
              <th style={{ ...TH,textAlign:"left",minWidth:155 }}>Gym</th>
              {DAYS.map(d=><th key={d} style={{ ...TH,textAlign:"center",minWidth:52 }}>{d}</th>)}
              <th style={{ ...TH,textAlign:"center" }}>Lessen</th>
              <th style={{ ...TH,textAlign:"center" }}>Uren/week</th>
            </tr></thead>
            <tbody>
              {gymStats.map(({ gym, totalMins }) => {
                const col = gymAccent(gym, PALETTE[gym.id]||"#888");
                return (
                  <tr key={gym.id} style={{ borderBottom:`1px solid ${T.border}` }}
                    onMouseEnter={e=>e.currentTarget.style.background=T.row}
                    onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    <td style={{ padding:"10px 12px",whiteSpace:"nowrap" }}>
                      <div style={{ display:"flex",alignItems:"center",gap:7 }}>
                        <div style={{ width:3,height:24,borderRadius:2,background:col,flexShrink:0 }}/>
                        <span style={{ fontSize:12,fontWeight:gym.isAtc?800:600,color:gymNameColor(gym, T.textSub) }}>
                          <GymTag gym={gym}/>
                        </span>
                      </div>
                    </td>
                    {DAYS.map(d => {
                      const count = cfd(gym,d).length;
                      const op = count>0 ? 0.25+(count/maxPerDay)*0.75 : 0;
                      return (
                        <td key={d} style={{ padding:"6px",textAlign:"center" }}>
                          <div style={{ width:36,height:30,borderRadius:6,margin:"0 auto",
                            background:count>0?col:T.row,opacity:count>0?op:1,
                            display:"flex",alignItems:"center",justifyContent:"center" }}>
                            {count>0&&<span style={{ fontSize:11,fontWeight:800,color:"#fff" }}>{count}</span>}
                          </div>
                        </td>
                      );
                    })}
                    <td style={{ padding:"8px 12px",textAlign:"center",fontWeight:800,fontSize:14,color:col }}>
                      {gym.schedule.filter(s=>!isOpenGym(s.cls) && catOn(s.cls)).length}
                    </td>
                    <td style={{ padding:"8px 12px",textAlign:"center",fontWeight:700,color:T.textSub }}>
                      {fmtH(totalMins)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Uren per categorie */}
      <div style={CARD}>
        <div style={{ padding:"16px 20px 12px",borderBottom:`1px solid ${T.border}` }}>
          <div style={LABEL}>Trainingsuren per categorie (per week)</div>
        </div>
        <div style={{ overflowX:"auto",padding:"0 0 4px" }}>
          <table style={{ width:"100%",borderCollapse:"collapse",minWidth:500 }}>
            <thead><tr>
              <th style={{ ...TH,textAlign:"left",minWidth:155 }}>Gym</th>
              {CATEGORIES.filter(cat => activeCats.includes(cat.key)).map(cat=>(
                <th key={cat.key} style={{ ...TH,textAlign:"center",minWidth:80 }}>
                  <span style={{ color:cat.color }}>{cat.label}</span>
                </th>
              ))}
              <th style={{ ...TH,textAlign:"center" }}>Totaal</th>
            </tr></thead>
            <tbody>
              {gymStats.map(({ gym, catMins, totalMins }) => {
                const col = gymAccent(gym, PALETTE[gym.id]||"#888");
                return (
                  <tr key={gym.id} style={{ borderBottom:`1px solid ${T.border}` }}
                    onMouseEnter={e=>e.currentTarget.style.background=T.row}
                    onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    <td style={{ padding:"10px 12px",whiteSpace:"nowrap" }}>
                      <div style={{ display:"flex",alignItems:"center",gap:7 }}>
                        <div style={{ width:3,height:24,borderRadius:2,background:col,flexShrink:0 }}/>
                        <span style={{ fontSize:12,fontWeight:gym.isAtc?800:600,color:gymNameColor(gym, T.textSub) }}>
                          <GymTag gym={gym}/>
                        </span>
                      </div>
                    </td>
                    {CATEGORIES.filter(cat => activeCats.includes(cat.key)).map(cat => {
                      const mins = catMins[cat.key]||0;
                      return (
                        <td key={cat.key} style={{ padding:"8px 12px",textAlign:"center" }}>
                          {mins>0
                            ? <span style={{ fontSize:12,fontWeight:700,color:cat.color }}>{fmtH(mins)}</span>
                            : <span style={{ fontSize:11,color:T.textMuted }}>—</span>}
                        </td>
                      );
                    })}
                    <td style={{ padding:"8px 12px",textAlign:"center",fontWeight:800,color:col }}>
                      {fmtH(totalMins)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Totale uren bar */}
      <div style={{ ...CARD,padding:20 }}>
        <div style={{ ...LABEL,marginBottom:14 }}>Totaal trainingsuren / week</div>
        {[...gymStats].sort((a,b)=>b.totalMins-a.totalMins).map(({ gym, totalMins }) => {
          const col = gymAccent(gym, PALETTE[gym.id]||"#888");
          const pct = (totalMins/maxMins)*100;
          return (
            <div key={gym.id} style={{ display:"flex",alignItems:"center",gap:10,marginBottom:6 }}>
              <div style={{ width:150,fontSize:10,fontWeight:gym.isAtc?700:500,
                color:gymNameColor(gym, T.textMuted),textAlign:"right",flexShrink:0,
                overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{gym.name}</div>
              <div style={{ flex:1,height:22,background:T.row,borderRadius:4,overflow:"hidden" }}>
                <div style={{ width:`${pct}%`,height:"100%",background:col,borderRadius:4,
                  display:"flex",alignItems:"center",paddingLeft:8,minWidth:4,transition:"width .4s" }}>
                  {pct>8&&<span style={{ fontSize:10,fontWeight:700,color:"#fff" }}>{fmtH(totalMins)}</span>}
                </div>
              </div>
              {pct<=8&&<span style={{ fontSize:10,color:T.textMuted,flexShrink:0 }}>{fmtH(totalMins)}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── VIEW: LIJST PER DAG ─────────────────────────────────────────────────────

function LijstView({ visibleGyms, activeCats, theme }) {
  const catOn = (cls) => activeCats.includes(getCat(cls).key);
  const T = theme || DARK_THEME;
  const CARD = getCard(T);
  const LABEL = getLabel(T);
  const DAY_MIN = 6 * 60;
  const DAY_MAX = 23 * 60;
  const TOTAL   = DAY_MAX - DAY_MIN;

  const pct  = (t) => ((tmin(t) - DAY_MIN) / TOTAL) * 100;
  const wPct = (f, t) => ((tmin(t) - tmin(f)) / TOTAL) * 100;

  const timeLabels = [6,8,10,12,14,16,18,20,22].map(h => ({
    h, pct: ((h*60 - DAY_MIN) / TOTAL) * 100
  }));
  const hourLines = Array.from({ length: (DAY_MAX - DAY_MIN) / 60 + 1 }, (_,i) => {
    const h = (DAY_MIN/60) + i;
    return { h, pct: (((h*60) - DAY_MIN) / TOTAL) * 100, major: h % 2 === 0 };
  });

  const classesForDay = (gym, d) =>
    gym.schedule
      .filter(s => s.day === d && !isOpenGym(s.cls) && catOn(s.cls))
      .sort((a,b)=>tmin(a.time)-tmin(b.time));

  const laneify = (items) => {
    const lanesEnd = [];
    return items.map(it => {
      const s = tmin(it.time), e = tmin(it.end);
      let lane = lanesEnd.findIndex(end => s >= end);
      if (lane === -1) { lane = lanesEnd.length; lanesEnd.push(e); }
      else lanesEnd[lane] = e;
      return { ...it, lane };
    });
  };

  return (
    <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
      {DAYS.map(day => {
        const perGym = visibleGyms.map(gym => {
          const items = classesForDay(gym, day);
          const laid  = laneify(items);
          const maxLane = laid.reduce((m,c)=>Math.max(m,c.lane), -1) + 1;
          return { gym, items: laid, maxLane };
        });

        const allItems = perGym.flatMap(g => g.items);
        const totalMins = allItems.reduce((a,c)=>a+tdur(c.time,c.end),0);

        return (
          <div key={day} style={{ ...CARD, overflow:"hidden" }}>
            {/* Header */}
            <div style={{ padding:"11px 18px",borderBottom:`1px solid ${T.border}`,
              display:"flex",alignItems:"center",gap:12,flexWrap:"wrap" }}>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif",fontSize:20,
                letterSpacing:2,color:T.text }}>{DAY_LABELS[day]}</div>
              <div style={{ fontSize:10,color:T.textMuted }}>
                {allItems.length} lessen · {fmtH(totalMins)}
              </div>
            </div>

            <div style={{ overflowX:"auto" }}>
              <div style={{ minWidth:820 }}>
                {/* Time axis */}
                <div style={{ display:"grid", gridTemplateColumns:"200px 1fr",
                  padding:"12px 18px 8px", borderBottom:`1px solid ${T.border}` }}>
                  <div style={{ ...LABEL, alignSelf:"end" }}>Gyms</div>
                  <div>
                    <div style={{ position:"relative", height:16, marginBottom:6 }}>
                      {timeLabels.map(({ h, pct: p }) => (
                        <div key={h} style={{ position:"absolute", left:`${p}%`,
                          fontSize:10, fontWeight:800, color:T.textSub,
                          textShadow: T.bg === DARK_THEME.bg ? "0 1px 0 #00000060" : "none",
                          transform:"translateX(-50%)" }}>
                          {String(h).padStart(2,"0")}:00
                        </div>
                      ))}
                    </div>
                    <div style={{ position:"relative", height:10 }}>
                      {hourLines.map(({ h, pct: p, major }) => (
                        <div key={h} style={{ position:"absolute", left:`${p}%`,
                          top:0, bottom:0, width:major?2:1,
                          background:major?T.border2:T.border,
                          opacity:major?1:0.65 }}/>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Rows per gym */}
                <div>
                  {perGym.map(({ gym, items, maxLane }) => {
                    const accent = gymAccent(gym, PALETTE[gym.id]||"#888");
                    const nameCol = gymNameColor(gym, T.textSub);
                    const rowHeight = Math.max(28, 10 + maxLane * 20);

                    return (
                      <div key={gym.id} style={{ display:"grid", gridTemplateColumns:"200px 1fr",
                        padding:"10px 18px", borderBottom:`1px solid ${T.border}` }}>
                        {/* Name cell */}
                        <div style={{ paddingRight:12, display:"flex", alignItems:"flex-start", gap:8 }}>
                          <div style={{ width:3, height:rowHeight, borderRadius:2, background:accent, flexShrink:0 }}/>
                          <div style={{ minWidth:0 }}>
                            <div style={{ fontSize:12, fontWeight:gym.isAtc?800:600, color:nameCol,
                              whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                              {gym.name}
                            </div>
                            <div style={{ fontSize:9, color:T.textMuted, marginTop:2 }}>
                              {items.length ? `${items.length} les${items.length!==1?"sen":""}` : "Geen lessen"}
                            </div>
                          </div>
                        </div>

                        {/* Timeline cell */}
                        <div style={{ position:"relative", height:rowHeight, background:T.bg,
                          border:`1px solid ${T.border}`, borderRadius:8, overflow:"hidden" }}>
                          {/* Grid lines */}
                          <div style={{ position:"absolute", inset:0, pointerEvents:"none", zIndex:0 }}>
                            {hourLines.map(({ h, pct: p, major }) => (
                              <div key={h} style={{ position:"absolute", left:`${p}%`,
                                top:0, bottom:0, width:major?2:1,
                                background:major?T.border2:T.border,
                                opacity:major?1:0.65 }}/>
                            ))}
                          </div>

                          {/* Lesson blocks */}
                          {items.map((c, i) => {
                            const cat = getCat(c.cls);
                            const top = 6 + c.lane * 20;
                            const left = pct(c.time);
                            const width = Math.max(0.5, wPct(c.time, c.end));
                            return (
                              <div key={i} title={`${c.time}–${c.end} · ${c.cls}`}
                                style={{
                                  position:"absolute",
                                  left:`${left}%`,
                                  width:`${width}%`,
                                  top,
                                  height:16,
                                  borderRadius:6,
                                  background:cat.color,
                                  opacity:0.9,
                                  border:`1px solid ${cat.color}80`,
                                  boxShadow: T.bg === DARK_THEME.bg ? "0 0 0 1px #00000020 inset" : "0 0 0 1px rgba(0,0,0,.08) inset",
                                  zIndex:2,
                                  overflow:"hidden",
                                }}>
                                <div style={{
                                  fontSize:9,
                                  fontWeight:800,
                                  color: T.bg === DARK_THEME.bg ? "#0b0b10" : "#1a1a2e",
                                  padding:"1px 6px",
                                  whiteSpace:"nowrap",
                                  textOverflow:"ellipsis",
                                  overflow:"hidden",
                                }}>
                                  {c.cls}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── VIEW: GATEN IN DE MARKT ─────────────────────────────────────────────────

function GatenView({ visibleGyms, activeCats, theme }) {
  const T = theme || DARK_THEME;
  const CARD = getCard(T);
  const LABEL = getLabel(T);
  const catOn = (cls) => activeCats.includes(getCat(cls).key);
  const cfd = (gym,d) => gym.schedule.filter(s=>s.day===d && !isOpenGym(s.cls) && catOn(s.cls));

  const data = useMemo(() => DAYS.map(day => {
    const all = visibleGyms.flatMap(g=>cfd(g,day));

    const slotInfo = SLOTS.map(slot => {
      const hits = all.filter(c=>tmin(c.time)>=slot.from&&tmin(c.time)<slot.to);
      return { ...slot, count:hits.length, isEmpty:hits.length===0 };
    });

    const catInfo = CATEGORIES.filter(c=>c.key!=="overig" && activeCats.includes(c.key)).map(cat => {
      const present = all.some(c=>getCat(c.cls).key===cat.key);
      return { ...cat, present };
    });

    const missingCats  = catInfo.filter(c=>!c.present);
    const presentCats  = catInfo.filter(c=>c.present);
    const emptySlots   = slotInfo.filter(s=>s.isEmpty).length;
    const gapScore     = emptySlots + missingCats.length;
    const level        = gapScore>=5?"veel":gapScore>=3?"enige":"weinig";
    const levelColor   = level==="veel"?"#4ade80":level==="enige"?"#fbbf24":"#505068";

    return { day, slotInfo, catInfo, missingCats, presentCats, gapScore, level, levelColor,
      totalLessen:all.length, totalMins:all.reduce((a,c)=>a+tdur(c.time,c.end),0) };
  }), [visibleGyms]);

  return (
    <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
      {/* Legenda */}
      <div style={{ ...CARD,padding:"11px 16px",display:"flex",gap:20,flexWrap:"wrap",alignItems:"center" }}>
        <div style={LABEL}>Legenda:</div>
        {[["#4ade80","#052e16","Aanwezig"],["#ef4444","#200505","Leeg → kans"],["#fbbf24","#1c1200","Weinig concurrentie"]].map(([c,bg,l])=>(
          <div key={l} style={{ display:"flex",alignItems:"center",gap:6,fontSize:11,color:T.textSub }}>
            <div style={{ width:10,height:10,borderRadius:2,background:bg,border:`1px solid ${c}40` }}/>
            {l}
          </div>
        ))}
      </div>

      {data.map(({ day, slotInfo, catInfo, missingCats, level, levelColor, totalLessen, totalMins }) => (
        <div key={day} style={{ ...CARD,overflow:"hidden" }}>
          {/* Header */}
          <div style={{ padding:"11px 18px",borderBottom:`1px solid ${T.border}`,
            display:"flex",alignItems:"center",gap:12,flexWrap:"wrap" }}>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif",fontSize:20,
              letterSpacing:2,color:T.text }}>{DAY_LABELS[day]}</div>
            <div style={{ fontSize:10,color:T.textMuted }}>
              {totalLessen} lessen · {fmtH(totalMins)}
            </div>
            <div style={{ marginLeft:"auto",display:"flex",alignItems:"center",gap:6 }}>
              <span style={{ fontSize:9,color:T.textMuted,fontWeight:600,
                textTransform:"uppercase",letterSpacing:1 }}>Kansen:</span>
              <span style={{ fontSize:11,fontWeight:800,color:levelColor,
                padding:"2px 10px",borderRadius:99,
                background:`${levelColor}12`,border:`1px solid ${levelColor}30` }}>
                {level==="veel"?"Veel ruimte":level==="enige"?"Enige ruimte":"Weinig ruimte"}
              </span>
            </div>
          </div>

          <div style={{ padding:"14px 18px",display:"flex",gap:16,flexWrap:"wrap" }}>
            {/* Tijdsloten */}
            <div style={{ flex:"1 1 200px" }}>
              <div style={{ ...LABEL,marginBottom:8 }}>Tijdsloten</div>
              <div style={{ display:"flex",flexDirection:"column",gap:4 }}>
                {slotInfo.map(slot => (
                  <div key={slot.key} style={{ display:"flex",alignItems:"center",gap:8,
                    padding:"7px 11px",borderRadius:7,
                    background:slot.isEmpty?"#1a0505":"#041204",
                    border:`1px solid ${slot.isEmpty?"#2a0808":"#082008"}` }}>
                    <div style={{ width:7,height:7,borderRadius:2,flexShrink:0,
                      background:slot.isEmpty?"#ef4444":"#4ade80" }}/>
                    <div style={{ flex:1 }}>
                      <span style={{ fontSize:11,fontWeight:600,
                        color:slot.isEmpty?"#f87171":"#86efac" }}>{slot.label}</span>
                      <span style={{ fontSize:9,color:T.textMuted,marginLeft:6 }}>
                        {String(Math.floor(slot.from/60)).padStart(2,"0")}:00–
                        {slot.to===24*60?"00:00":String(Math.floor(slot.to/60)).padStart(2,"0")+":00"}
                      </span>
                    </div>
                    <span style={{ fontSize:10,fontWeight:700,flexShrink:0,
                      color:slot.isEmpty?"#ef4444":"#86efac" }}>
                      {slot.isEmpty?"leeg →  kans":`${slot.count} les${slot.count!==1?"sen":""}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Disciplines */}
            <div style={{ flex:"2 1 300px" }}>
              <div style={{ ...LABEL,marginBottom:8 }}>Disciplines</div>
              <div style={{ display:"flex",flexWrap:"wrap",gap:5,marginBottom:10 }}>
                {catInfo.map(cat => (
                  <div key={cat.key} style={{ padding:"5px 10px",borderRadius:6,
                    background:cat.present?"#041204":"#1a0505",
                    border:`1px solid ${cat.present?"#082008":"#2a0808"}`,
                    display:"flex",alignItems:"center",gap:5 }}>
                    <div style={{ width:6,height:6,borderRadius:2,
                      background:cat.present?"#4ade80":"#ef4444",flexShrink:0 }}/>
                    <span style={{ fontSize:10,fontWeight:600,
                      color:cat.present?"#86efac":"#f87171" }}>{cat.label}</span>
                    {!cat.present&&<span style={{ fontSize:8,color:"#ef4444",
                      fontWeight:700,letterSpacing:.5 }}>KANS</span>}
                  </div>
                ))}
              </div>

              {missingCats.length>0 && (
                <div style={{ padding:"9px 13px",background:"#120303",
                  border:"1px solid #250606",borderRadius:7,
                  fontSize:11,color:"#fca5a5",lineHeight:1.5 }}>
                  <span style={{ fontSize:14,marginRight:6 }}>💡</span>
                  <strong>Kans op {DAY_LABELS[day]}:</strong>{" "}
                  Niemand biedt nog <strong>{missingCats.map(c=>c.label).join(", ")}</strong> aan.
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── VIEW: OPEN GYM ──────────────────────────────────────────────────────────

function OpenGymView({ theme }) {
  const T = theme || DARK_THEME;
  const CARD = getCard(T);
  const LABEL = getLabel(T);
  const DAY_MIN = 6 * 60;
  const DAY_MAX = 23 * 60;
  const TOTAL   = DAY_MAX - DAY_MIN;

  const pct  = (t) => ((tmin(t) - DAY_MIN) / TOTAL) * 100;
  const wPct = (f, t) => ((tmin(t) - tmin(f)) / TOTAL) * 100;

  // Hoeveel gyms open per tijdstip per dag
  const overlapByDay = useMemo(() => {
    return DAYS.map(day => {
      // Maak een minuut-voor-minuut array (6:00–23:00 = 1020 min)
      const counts = new Array(TOTAL).fill(0);
      for (const gym of openGymDataSorted) {
        const dayHours = gym.hours.find(h => h.day === day);
        if (!dayHours) continue;
        for (const slot of dayHours.slots) {
          const s = tmin(slot.from) - DAY_MIN;
          const e = tmin(slot.to)   - DAY_MIN;
          for (let m = Math.max(0,s); m < Math.min(TOTAL,e); m++) counts[m]++;
        }
      }
      // Vind momenten waar GEEN enkele gym open is
      const gaps = [];
      let gapStart = null;
      for (let m = 0; m < TOTAL; m++) {
        if (counts[m] === 0 && gapStart === null) gapStart = m;
        if (counts[m] > 0 && gapStart !== null) {
          if (m - gapStart >= 30) gaps.push({ from: gapStart + DAY_MIN, to: m + DAY_MIN });
          gapStart = null;
        }
      }
      if (gapStart !== null && TOTAL - gapStart >= 30)
        gaps.push({ from: gapStart + DAY_MIN, to: TOTAL + DAY_MIN });
      return { day, gaps };
    });
  }, []);

  const minToStr = m => {
    const h = Math.floor(m/60), min = m%60;
    return `${String(h).padStart(2,"0")}:${String(min).padStart(2,"0")}`;
  };

  // Tijdlabels op de as
  const timeLabels = [6,8,10,12,14,16,18,20,22].map(h => ({
    h, pct: ((h*60 - DAY_MIN) / TOTAL) * 100
  }));

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

      {/* Legenda */}
      <div style={{ ...CARD, padding:"11px 16px", display:"flex", gap:20, flexWrap:"wrap", alignItems:"center" }}>
        <div style={LABEL}>Legenda:</div>
        {openGymDataSorted.map((g,i) => (
          <div key={g.id} style={{ display:"flex", alignItems:"center", gap:6, fontSize:11, color:T.textSub }}>
            <div style={{ width:14, height:10, borderRadius:2, background:gymAccent(g, PALETTE[i]), opacity:0.85 }}/>
            {g.name}
          </div>
        ))}
        <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:11, color:"#ef4444" }}>
          <div style={{ width:14, height:10, borderRadius:2,
            background:"repeating-linear-gradient(45deg,#ef444430,#ef444430 3px,transparent 3px,transparent 6px)",
            border:"1px solid #ef444450" }}/>
          Gat (niemand open)
        </div>
      </div>

      {/* Per dag */}
      {DAYS.map((day, di) => {
        const { gaps } = overlapByDay[di];
        return (
          <div key={day} style={CARD}>
            {/* Dag header */}
            <div style={{ padding:"11px 18px", borderBottom:`1px solid ${T.border}`,
              display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:20,
                letterSpacing:2, color:T.text }}>{DAY_LABELS[day]}</div>
              {gaps.length > 0 && (
                <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                  {gaps.map((g,i) => (
                    <span key={i} style={{ fontSize:10, fontWeight:700, color:"#ef4444",
                      padding:"2px 8px", borderRadius:99,
                      background:"#200505", border:"1px solid #3a0808" }}>
                      💡 {minToStr(g.from)}–{minToStr(g.to)} niemand open
                    </span>
                  ))}
                </div>
              )}
              {gaps.length === 0 && (
                <span style={{ fontSize:10, color:T.textMuted }}>Altijd minimaal 1 gym open</span>
              )}
            </div>

            <div style={{ padding:"16px 20px" }}>
              {/* Tijdas */}
              <div style={{ position:"relative", height:16, marginBottom:6 }}>
                {timeLabels.map(({ h, pct: p }) => (
                  <div key={h} style={{ position:"absolute", left:`${p}%`,
                    fontSize:9, color:T.textMuted, transform:"translateX(-50%)" }}>
                    {String(h).padStart(2,"0")}:00
                  </div>
                ))}
              </div>

              {/* Grid lijnen */}
              <div style={{ position:"relative" }}>
                <div style={{ position:"absolute", inset:0, pointerEvents:"none", zIndex:0 }}>
                  {timeLabels.map(({ h, pct: p }) => (
                    <div key={h} style={{ position:"absolute", left:`${p}%`,
                      top:0, bottom:0, width:1, background:T.border }}/>
                  ))}
                </div>

                {/* Gaten markering */}
                {gaps.map((g,i) => (
                  <div key={i} style={{
                    position:"absolute", zIndex:1,
                    left:`${pct(minToStr(g.from))}%`,
                    width:`${wPct(minToStr(g.from), minToStr(g.to))}%`,
                    top:0, bottom:0,
                    background:"repeating-linear-gradient(45deg,#ef444418,#ef444418 4px,transparent 4px,transparent 8px)",
                    borderLeft:"1px solid #ef444450",
                    borderRight:"1px solid #ef444450",
                  }}/>
                ))}

                {/* Gym bars */}
                {openGymDataSorted.map((gym, gi) => {
                  const dayHours = gym.hours.find(h => h.day === day);
                  const col = gymAccent(gym, PALETTE[gi]);
                  return (
                    <div key={gym.id} style={{ position:"relative", height:32, marginBottom:4,
                      background:T.bg, borderRadius:6, overflow:"hidden", zIndex:2 }}>
                      {/* Lege achtergrond */}
                      <div style={{ position:"absolute", inset:0,
                        display:"flex", alignItems:"center", paddingLeft:6 }}>
                        <span style={{ fontSize:10, color:T.textMuted, fontWeight:600 }}>
                          {gym.name}
                        </span>
                      </div>
                      {/* Openingstijden blokken */}
                      {dayHours ? dayHours.slots.map((slot, si) => (
                        <div key={si} style={{
                          position:"absolute",
                          left:`${pct(slot.from)}%`,
                          width:`${wPct(slot.from, slot.to)}%`,
                          top:3, bottom:3, borderRadius:4,
                          background:col, opacity:0.85,
                          display:"flex", alignItems:"center",
                          justifyContent:"center", overflow:"hidden",
                          zIndex:3,
                        }}>
                          <span style={{ fontSize:9, fontWeight:700, color:"#fff",
                            whiteSpace:"nowrap", padding:"0 4px" }}>
                            {slot.from}–{slot.to}
                          </span>
                        </div>
                      )) : (
                        <div style={{ position:"absolute", inset:0,
                          display:"flex", alignItems:"center", justifyContent:"flex-end",
                          paddingRight:8, zIndex:3 }}>
                          <span style={{ fontSize:9, color:T.textMuted }}>gesloten</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── APP ─────────────────────────────────────────────────────────────────────

const TABS = [
  ["dag",     "Per Dag"],
  ["week",    "Weekoverzicht"],
  ["lijst",   "Lijst per dag"],
  ["gaten",   "Gaten in markt"],
  ["opengym", "Open Gym"],
];
const DARK_THEME = {
  bg:       "#08080f",
  surface:  "#0d0d18",
  border:   "#0f0f1e",
  border2:  "#151528",
  text:     "#e0e0e0",
  textMuted:"#404060",
  textSub:  "#c0c0cc",
  row:      "#101020",
  btnBgA:   "#141428",
  btnBorder:"#151528",
};
const LIGHT_THEME = {
  bg:       "#f4f4f8",
  surface:  "#ffffff",
  border:   "#e0e0ea",
  border2:  "#d0d0e0",
  text:     "#1a1a2e",
  textMuted:"#888899",
  textSub:  "#444455",
  row:      "#f0f0f8",
  btnBgA:   "#e8e8f8",
  btnBorder:"#c0c0d8",
};
export default function ScheduleDashboard({ noHeader, dark: darkProp, setDark: setDarkProp }) {
  const [internalDark, setInternalDark] = useState(true);
  const dark = darkProp !== undefined ? darkProp : internalDark;
  const setDark = setDarkProp !== undefined ? setDarkProp : setInternalDark;

  const [tab,        setTab]        = useState("dag");
  const [day,        setDay]        = useState("Ma");
  const [activeGyms, setActiveGyms] = useState(gymsSorted.map(g=>g.id));
  const [activeCats, setActiveCats] = useState(CATEGORIES.map(c=>c.key));

  const toggleGym    = id => setActiveGyms(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id]);
  const toggleCat    = key => setActiveCats(p=>p.includes(key)?p.filter(x=>x!==key):[...p,key]);
  const visibleGyms  = gymsSorted.filter(g=>activeGyms.includes(g.id));
  const T = dark ? DARK_THEME : LIGHT_THEME;
  const catOn        = (cls) => activeCats.includes(getCat(cls).key);

  return (
    <div style={{ fontFamily:"'DM Sans',system-ui,sans-serif",background:T.bg,minHeight:noHeader?"100%":"100vh",width:"100%",color:T.text }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Bebas+Neue&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        body{background:${T.bg};}
        button{font-family:inherit;cursor:pointer;}
        ::-webkit-scrollbar{width:4px;height:4px;}
        ::-webkit-scrollbar-thumb{background:${T.border2};border-radius:2px;}
      `}</style>

      {!noHeader && (
      <header style={{ padding:"13px 24px",borderBottom:`1px solid ${T.border}`,
  display:"flex", alignItems:"center", gap:14, background:T.bg }}>
        <span style={{ fontFamily:"'Bebas Neue',sans-serif",fontSize:26,letterSpacing:3,
          background:"linear-gradient(120deg,#e63946,#f4a261)",
          WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent" }}>ATC</span>
        <span style={{ color:T.textMuted }}>|</span>
        <span style={{ fontSize:12,color:T.textMuted,fontWeight:500 }}>Rooster Analyse · Amsterdam</span>
        <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:16 }}>
  <span style={{ fontSize:11, color:T.textMuted }}>
    {visibleGyms.length}/{gymsSorted.length} gyms · {visibleGyms.reduce((a,g)=>a+g.schedule.filter(s=>!isOpenGym(s.cls) && catOn(s.cls)).length,0)} lessen
  </span>

  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
    <span style={{ fontSize:13 }}>{dark ? "🌙" : "☀️"}</span>
    <div
      onClick={() => setDark(d => !d)}
      style={{
        width:44, height:24, borderRadius:12, cursor:"pointer",
        background: dark ? "#2a2a4a" : "#c8c8d8",
        position:"relative", transition:"background .2s",
      }}
    >
      <div style={{
        position:"absolute", top:3,
        left: dark ? 23 : 3,
        width:18, height:18, borderRadius:"50%",
        background: dark ? "#8080c0" : "#ffffff",
        boxShadow:"0 1px 3px rgba(0,0,0,.3)",
        transition:"left .2s",
      }}/>
    </div>
    <span style={{ fontSize:13 }}>{dark ? "" : "🌙"}</span>
  </div>
</div>
      </header>
      )}

      <div style={{ display:"flex",height:noHeader?"calc(100vh - 53px)":"calc(100vh - 53px)" }}>

        {/* Sidebar */}
        <aside style={{ width:200, borderRight:`1px solid ${T.border}`,
  padding:"16px 12px", overflowY:"auto", flexShrink:0, background:T.bg }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
  <div style={{ ...getLabel(T) }}>Gyms</div>
  <div style={{ display:"flex", gap:4 }}>
    <button onClick={() => setActiveGyms(gymsSorted.map(g=>g.id))}
      style={{ fontSize:9, fontWeight:700, letterSpacing:"1px", textTransform:"uppercase",
        padding:"3px 7px", borderRadius:5, border:`1px solid ${T.border2}`,
        color:T.textMuted, background:"transparent", cursor:"pointer" }}>
      Alles aan
    </button>
    <button onClick={() => setActiveGyms([])}
      style={{ fontSize:9, fontWeight:700, letterSpacing:"1px", textTransform:"uppercase",
        padding:"3px 7px", borderRadius:5, border:`1px solid ${T.border2}`,
        color:T.textMuted, background:"transparent", cursor:"pointer" }}>
      Alles uit
    </button>
  </div>
</div>
          {gymsSorted.map((gym,i) => {
            const active = activeGyms.includes(gym.id);
            const col    = gymAccent(gym, PALETTE[i]||"#888");
            return (
              <button key={gym.id} onClick={()=>toggleGym(gym.id)} style={{
                display:"flex",alignItems:"center",gap:8,width:"100%",
                padding:"7px 8px",borderRadius:8,marginBottom:3,
                background:active?T.surface:"transparent",
                border:`1px solid ${active?T.border2:"transparent"}`,
                opacity:active?1:0.3,transition:"all .15s",textAlign:"left",
              }}>
                <div style={{ width:3,height:30,borderRadius:2,background:col,flexShrink:0 }}/>
                <div>
                  <div style={{ fontSize:11,fontWeight:gym.isAtc?800:600,
                    color:gymNameColor(gym, T.textSub),lineHeight:1.3 }}>
                    <GymTag gym={gym}/>
                  </div>
                  <div style={{ fontSize:9,color:T.textMuted,marginTop:1 }}>
                    {gym.schedule.filter(s=>!isOpenGym(s.cls) && catOn(s.cls)).length} lessen/week
                  </div>
                </div>
              </button>
            );
          })}

          <div style={{ height:1,background:T.border,margin:"16px 0" }}/>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
  <div style={{ ...getLabel(T) }}>Categorieën</div>
  <div style={{ display:"flex", gap:4 }}>
    <button onClick={() => setActiveCats(CATEGORIES.map(c=>c.key))}
      style={{ fontSize:9, fontWeight:700, letterSpacing:"1px", textTransform:"uppercase",
        padding:"3px 7px", borderRadius:5, border:`1px solid ${T.border2}`,
        color:T.textMuted, background:"transparent", cursor:"pointer" }}>
      Alles aan
    </button>
    <button onClick={() => setActiveCats([])}
      style={{ fontSize:9, fontWeight:700, letterSpacing:"1px", textTransform:"uppercase",
        padding:"3px 7px", borderRadius:5, border:`1px solid ${T.border2}`,
        color:T.textMuted, background:"transparent", cursor:"pointer" }}>
      Alles uit
    </button>
  </div>
</div>
          {CATEGORIES.map(cat=>{
            const active = activeCats.includes(cat.key);
            return (
              <button key={cat.key} onClick={()=>toggleCat(cat.key)} style={{
                display:"flex",alignItems:"center",gap:8,width:"100%",
                padding:"6px 8px",borderRadius:8,marginBottom:3,
                background:active?T.surface:"transparent",
                border:`1px solid ${active?`${cat.color}40`:"transparent"}`,
                opacity:active?1:0.3,transition:"all .15s",textAlign:"left",
              }}>
                <div style={{ width:7,height:7,borderRadius:2,background:cat.color,flexShrink:0 }}/>
                <span style={{ fontSize:10,fontWeight:700,color:active?cat.color:T.textMuted }}>{cat.label}</span>
              </button>
            );
          })}
        </aside>

        {/* Main */}
        <main style={{ flex:1,overflowY:"auto",padding:"18px 20px" }}>
          <div style={{ display:"flex",gap:2,background:T.surface,border:`1px solid ${T.border2}`,
            borderRadius:9,padding:3,marginBottom:18,width:"fit-content" }}>
            {TABS.map(([k,l])=>(
              <button key={k} onClick={()=>setTab(k)} style={{
                padding:"6px 16px",borderRadius:7,fontSize:12,fontWeight:700,
                border:"none",transition:"all .15s",letterSpacing:.3,
                background:tab===k?T.btnBgA:"transparent",
                color:tab===k?"#fff":T.textMuted,
              }}>{l}</button>
            ))}
          </div>

          {tab==="dag"     && <DagView     visibleGyms={visibleGyms} day={day} setDay={setDay} activeCats={activeCats} theme={T}/>}
          {tab==="week"    && <WeekView    visibleGyms={visibleGyms} activeCats={activeCats} theme={T}/>}
          {tab==="lijst"   && <LijstView   visibleGyms={visibleGyms} activeCats={activeCats} theme={T}/>}
          {tab==="gaten"   && <GatenView   visibleGyms={visibleGyms} activeCats={activeCats} theme={T}/>}
          {tab==="opengym" && <OpenGymView theme={T}/>}
        </main>
      </div>
    </div>
  );
}
