// translation, by John Cayley
// installed version released Feb 2019
/* globals RiText,Hammer */
// configuration
const VERSION = "0.2.2";
// 0.2.1 is a significant change the first installed version
// 0.2.2 with browser-detect and Tone.js
const browser = browserDetect();
console.log(browser);
//
const PRODUCTION = false, INSTALLED = false;
var AMBIENCE_TIME = 8 * 60 * 1000;
//
var withAudio = true, paused = true, firstGasp = true; // playCount = 0
const TITLES_FX_SECS = .05, SUFLOSI_FX_SECS = 1.25;
var fxSeconds = TITLES_FX_SECS;
var SECONDS_FOR_TITLE = INSTALLED ? 15 : 30;
const IVORY_ON_BLACK = true;
const BLACK = [0, 0, 0, 255];
const IVORY = [255, 255, 240, 255];
var FILL, BACKGROUND;
// constants
const FLOATING = 0, SURFACING = 1, SINKING = 2;
const BUOYANCY_STRINGS = ["floating","surfacing","sinking"];
// var NO_SPACES = false, NO_APOSTROPHE = false;
const SPC = " ", SPC_NUM = 0;
const SPCS = "                                                                  ";
const ABC = " abcdefghijklmnopqrstuvwxyz";
const WIDTH = 1220, HEIGHT = 720;
const TEXT_X = 700, TEXT_Y = 56, IMG_X = 140; // TEXT_Y was 80
var lineY;
const FONT_SIZE = 20, LEADING = FONT_SIZE + Math.ceil(FONT_SIZE / 3);
// the following is from noth'rs (as used for riverIsland, etc.
// NOT used for transliteral drifting)
// var ALPHA_LOOP = " eaiouüy’lrwvjghkcxzqbpfsmndt";
// attempt to rearrange this with respect to subliteral differences:
// var ALPHA_LOOP = "jiaeocuyvwmnhrlftkxszgqbpd";
const DEFAULT_LANGUAGE = "en";
const LANGUAGES = ["de","fr","en","dp","fp","ep"];
var surfacingLang = "de", sLangIndex = 0;
//
// general
var promises = [], captions = [];
var standingOrder = "continue", feedback = false;
var showStatusUntil = 0;
var monoFont, captionFont;
// NOT used in translation
// var titleFont,serifFont;
var titles = [];
var titlePassage;
var texts, modelTexts, literalAlts, passagesLength;
var passages = [];
var imageWidth, imageHeight;
var correlativeImages = {}; // "de":[],"fr":[],"en":[]
for (let lang of LANGUAGES) {
  correlativeImages[lang] = [];
}
var cursorImages = [];
var statusCaption;
var statusCaptions = [
  "Opening sequence to titles", "Titles", "Titles closing transition",
  "Passages surfacing", "Ambient state", "Passages sinking to close",
  "translation quit"
];
var stateHandler, rg;
var phase = 0;
//
// audio-related
const SEMITONE_RATIO = Math.pow(2, 1/12);
const BASE_NOTE = 60, BREATH = 5000;
var compressor;
var audioCursors = [];
var langSounds = {};
var bell, rolls,grin, letternotes;
var sounds = [];
var breathin = true, lastBreath = 0;
var playCount = 0;
var numberOfAudioCursors;
//
// gestures
var gestures, canvas;

// ----- P5 FUNCTIONS -----
function preload() {
  // ---- FONTS ----
  // titleFont = loadFont('../fonts/TrajanPro-Regular.otf');
  // mono possible: DejaVuSansMono, Consolas, AndaleMono, PrestigeEliteStd-Bd.otf
  monoFont = loadFont("fonts/Monaco.ttf");
  // serif possible: iowansrm, Constantia, DejaVuSerif, Cambria, Perpetua
  // serifFont = loadFont('../fonts/iowaosrm.ttf')
  // captionFont = loadFont('../fonts/Monaco.ttf');
  // ---- TEXT & TEXT VARIABLES ----
  literalAlts = loadStrings("literalalts.json");
  texts = loadStrings("translationtexts.json");
  // ---- IMAGES ----
  for (let i = 0; i < 27; i++) {
    let fn = (i < 10) ? "w0" + i : "w" + i;
    let newCursor = loadImage("abimages/" + fn + ".png");
    cursorImages.push(newCursor);
  }
  for (let lang of LANGUAGES) {
    for (let i = 0; i < 27; i++) {
      let fn = (i < 10) ? lang + "0" + i : lang + i;
      let newImage = loadImage("transimages/" + fn + ".png");
      correlativeImages[lang].push(newImage);
    }
  }
  // ----- AUDIO -----
  for (let lang of LANGUAGES) {
    langSounds[lang] = [26];
    for (let i = 0; i < 26; i++) {
      langSounds[lang][i] = new Tone.Player("transaudio/" + lang.substr(0,1) + ABC.substr(i+1,1) + ".wav");
    }
  }
  bell = new Tone.Player("transaudio/underwaterBellStereo.mp3");
  sounds.push(bell);
  rolls = new Tone.Player("transaudio/surdoRollsStereo.mp3");
  sounds.push(rolls);
  grin = new Tone.Player("transaudio/grin.wav");
  sounds.push(grin);
  if (!browser.mobile) compressor = new Tone.Compressor();
  letternotes = loadStrings("letternotes.json");
  //
  rg = new RiGrammar();
  rg.loadFrom("translationgrammar.json");
}

function setup() {

  info("translation version " + VERSION);
  createCanvas(WIDTH, HEIGHT);

  FILL  = (IVORY_ON_BLACK ? IVORY : BLACK);
  BACKGROUND = (IVORY_ON_BLACK ? BLACK : IVORY);
  //
  RiText.defaultFont(monoFont,FONT_SIZE);
  RiText.defaultFontSize(FONT_SIZE);
  RiText.defaultFill(FILL);

  // literalAlts is an object with
  // per language objects with`
  // alt letter pairings
  literalAlts = JSON.parse(literalAlts.join(""));
  // modelTexts is an object with
  // texts in a language that are
  // an array of passages with length = 4
  modelTexts = JSON.parse(texts.join(""));
  passagesLength = modelTexts[DEFAULT_LANGUAGE].length;

  // purely to initialize image size:
  imageWidth = correlativeImages[DEFAULT_LANGUAGE][0].width;
  imageHeight = correlativeImages[DEFAULT_LANGUAGE][0].height;

  // ---- set up Gestures ----
  gestures = new Hammer.Manager(canvas);
  // gestures.set({ domEvents: true});
  // gestures.get("pinch").set({ enable: true });

  gestures.add(new Hammer.Swipe({ direction: Hammer.DIRECTION_ALL, domEvents: true }));
  gestures.add(new Hammer.Swipe({ event: "doubleswipe", pointers: 2 }) );
  gestures.add(new Hammer.Press());
  gestures.add(new Hammer.Press({ event: "doublepress", pointers: 2 }) );

  gestures.on("swipeleft", function() {
    standingOrder = "next";
    feedback = true;
    // info("swipeleft: " + standingOrder);
  });

  gestures.on("swiperight", function() {
    standingOrder = "previous";
    feedback = true;
    // info("swiperight: " + standingOrder);
  });

  gestures.on("doubleswipe", function() {
    standingOrder = "quit";
    // info("swipedown: " + standingOrder);
  });

  gestures.on("press", function() {
    standingOrder = "pressing";
    // info("press: " + standingOrder);
  });

  gestures.on("pressup", function() {
    standingOrder = "continue";
    // info("pressup: " + standingOrder);
  });

  gestures.on("doublepress", function() {
    standingOrder = "continue";
    toggleAudio(paused);
    // info("swipeup: audio " + (withAudio ? "on" : "off"));
  });

  // ---- info Captions ----
  statusCaption = new RiText(statusCaptions[0]);
  statusCaption.position(0,FONT_SIZE);
  statusCaption.alpha(0);
  setStatusCaption(phase);
  let capY = TEXT_Y + 2 * LEADING; //  - LEADING / 2
  for (let i = 0; i < passagesLength; i++) {
    captions.push(new RiText(""));
    // captions[i].fontSize(FONT_SIZE * .8);
    captions[i].position(0, capY); // WIDTH - captions[i].textWidth() -4
    captions[i].alpha(0);
    // info(captions[i].y);
    capY += 6 * LEADING;
  }

  // ---- Titles ----
  titles.push("t r a n s l a t i o n");
  titles.push("John Cayley");
  titles.push("a m b i e n t   p o e t i c s");
  titles.push("based on the 2004 QuickTime version | refactured in js 2019");
  titles.push("organized sound designs by Giles Perring");
  titles.push("alphabets sung by Melanie Pappenheim");
  titles.push(VERSION + " p5.js, Tone.js, Daniel C. Howe’s RiTa");
  titles.push(INSTALLED ? " " : " –> or mobile swipe-left to move on or quit by sinking");
  titles.push(INSTALLED ? " " : "<– or mobile swipe-right to go back to previous state");
  titles.push(INSTALLED ? " " : "Spacebar or mobile two-finger press to toggle audio");
  titles.push(INSTALLED ? " " : "hold Shift or mobile press for state information");
  titles.push(INSTALLED ? " " : "Q or mobile two-finger swipe-left to quit abruptly");
  titles.push("programmatology.shadoof.net/?translation");

  titlePassage = new Passage();
  titlePassage.model[DEFAULT_LANGUAGE] = titles;

  lineY = 140;
  titlePassage.displayText = [titles.length];
  for (let i = 0; i < titles.length; i++) {
    titlePassage.displayText[i] = new RiText(titles[i]);
    titlePassage.displayText[i].position(WIDTH/2 - titlePassage.displayText[i].textWidth()/2, lineY);
    // we're opening with all spaces, so replace letters with spaces
    titlePassage.displayText[i].text(titles[i].replace(/[a-z]/g," "));
    // adding a copy to the rt for crossFades
    titlePassage.displayText[i].fadeFromText = titlePassage.displayText[i].copy();
    titlePassage.displayText[i].fadeFromText.alpha(0);
    switch (i) {
      case 0: lineY += LEADING * 1.2; break;
      case 1: lineY += LEADING * 1.2; break;
      case 2: lineY += LEADING * .5; break;
      case 6: lineY += LEADING * .5; break;
      case 11: lineY += LEADING * .5; break;
    }
    lineY += LEADING;
  }

  // the following constructs arrays of Passage objects
  // in the passages object:
  // 1) the .model array of model strings,
  // 2) a .displayText array of RiTexts with
  // the currently displayed text (on right),
  // 3) .displayImages, an array with line-correspondent
  // arrays of FXImage objects, wrapping p5Images
  // (for the visualization on the left)
  // load pixels for the image that will be used below:
  correlativeImages[DEFAULT_LANGUAGE][0].loadPixels();

  lineY = TEXT_Y;
  for (let i = 0; i < passagesLength; i++) {
    passages.push(new Passage());
    // find the number of lines in this passage
    let passageLinesLength = modelTexts[DEFAULT_LANGUAGE][i].length;
    // determine longest lines
    let lineLengthsMax = [ passageLinesLength ];
    for (let j = 0; j < passageLinesLength; j++) {
      lineLengthsMax[j] = 0;
      for (let lang of LANGUAGES) {
        let newLineLength = modelTexts[lang][i][j].length;
        lineLengthsMax[j] = newLineLength > lineLengthsMax[j] ? newLineLength : lineLengthsMax[j];
      }
    }
    for (let lang of LANGUAGES) {
      passages[i].model[lang] = [ passageLinesLength ];
    }
    // build model texts
    // per language for each passage
    // with maximum line length, padding if necessary
    for (let j = 0; j < passageLinesLength; j++) {
      for (let lang of LANGUAGES) {
        // passages[i].model = {};
        let modelLine = modelTexts[lang][i][j];
        passages[i].model[lang][j] = modelLine;
        let modelLength = passages[i].model[lang][j].length;
        if (lineLengthsMax[j] > modelLength) {
          passages[i].model[lang][j] = modelLine.padEnd(lineLengthsMax[j], SPC);
        }
      }
    }
    // now create the displayText and images for each passage
    passages[i].displayText = [ passageLinesLength ];
    passages[i].displayImages = [ passageLinesLength ];
    for (let j = 0; j < passageLinesLength; j++) {
      // actual text first but only as spaces
      passages[i].displayText[j] = new RiText(SPCS.substring(0,passages[i].model[DEFAULT_LANGUAGE][j].length));
      passages[i].displayText[j].position(TEXT_X, lineY);
      // were opening with all spaces, so replace letters with spaces
      // fillWithSpaces(passages[lang][i].displayText[j]);
      // adding a copy to the rt for crossFades
      passages[i].displayText[j].fadeFromText = passages[i].displayText[j].copy();
      passages[i].displayText[j].fadeFromText.alpha(0);
      lineY += LEADING;
      // now images
      let lineLength = passages[i].displayText[j].text().length;
      passages[i].displayImages[j] = [ lineLength ];
      // the displayText passages are all spaces
      // so we only need to initialize the
      // corresponding images with a black rect
      for (let k = 0; k < lineLength; k++) {
        let theImage = createImage(imageWidth,imageHeight);
        theImage.loadPixels();
        for (let p = 0; p < imageWidth * imageHeight * 4; p++) {
          theImage.pixels[p] = correlativeImages[DEFAULT_LANGUAGE][0].pixels[p];
        }
        theImage.updatePixels();
        passages[i].displayImages[j][k] = new FXImage(theImage);
      }
    }
    lineY += LEADING;
  }
  // the following for-loop lines are belt+braces since, it seems
  // that any p5.Images used as reference, for their pixels,
  // must call loadPixels during an initialization phase or else,
  // (the symptom was) they will not be accessible to the
  // members and methods, at least, of my FXImage wrapper
  // 'bug' discovered in earlier code, when:
  // not all waveImage objects were referenced
  // i.e. for j, q, x, and z which aren't in the model text.
  // This was a difficult bug to figure out!
  for (let lang of LANGUAGES) {
    for (let image of correlativeImages[lang]) {
      image.loadPixels();
    }
  }
  //
  // set cursors
  audioCursors.push(new AudioCursor(.3));
  audioCursors.push(new AudioCursor(.5,2));
  letternotes = JSON.parse(letternotes.join(""));
  // HERE WE GO
  //
  stateHandler = new StateHandler(rg);
  translation();
}

async function translation() {
  let translationPhases = [];
  translationPhases.push(openToTitles);
  translationPhases.push(showTitles);
  translationPhases.push(transFromTitles);
  translationPhases.push(translationSurface);
  translationPhases.push(translationAmbient);
  translationPhases.push(translationSink);
  //
  do {
    info("trying phase: " + phase);
    try {
      await translationPhases[phase]();
      info("came back resolved in main do loop at phase: " + phase);
    } catch (err) {
      //
      info("caught " + err.message + " in main do loop");
      standingOrder = handleInterruption(err, feedback);
    } finally {
      if (standingOrder == "next" || standingOrder == "previous") {
        standingOrder = "continue";
      }
    }
    if (phase >= translationPhases.length) {
      // add quit method here or adjust to keep it ambient
      if (INSTALLED && (standingOrder != "quit")) {
        standingOrder = "continue";
        phase = 0;
      } else {
        standingOrder = "quit";
        cleanUpAndQuit();
      }
    }
  }
  while (standingOrder == "continue");
}

async function openToTitles() {
  setStatusCaption(phase);
  fxSeconds = TITLES_FX_SECS;
  for (let passage of passages) {
    for (let rt of passage.displayText) {
      fillWithSpaces(rt);
    }
    for (let fxImages of passage.displayImages) {
      for (let i = 0; i < fxImages.length; i++) {
        fxImages[i].shutter();
      }
    }
  }
  // make sure we can see the titles
  for (let rt of titlePassage.displayText) {
    rt.text(rt.text().replace(/./g," "));
    rt.alpha(255);
  }

  // make sure TODO: this is done before any return here
  // ? use cleanUp()
  // the images and displayText are cleared
  // for (let passage[language] of passages) {
  //   var j = 0;
  //   for (let rt of passage.displayText) {
  //     fillWithSpaces(rt);
  //     for (let fxImage of passage.displayImages[j++]) {
  //       replacePixels(fxImage.displayText,correlativeImages[0]);
  //     }
  //   }
  // }

  try {
    await titlePassage.drift(0, SURFACING);
  } catch (err) {
    if (err.message == "previous" || err.message == "quit") {
      return Promise.reject(new Error(err.message));
    }
    standingOrder = handleInterruption(err, feedback);
  }
  phase = 1;
}

// try {
//   await translationShowTitles (millis() + 30 * 1000);
// } catch (err) {
//   if (err.message == "previous" || err.message == "quit") {
//     return Promise.reject(new Error(err.message));
//   }
//   standingOrder = handleInterruption(err);
// }
//
// resetPhase(0);
async function showTitles() {
  setStatusCaption(phase);
  let i = 0;
  for (let rt of titlePassage.displayText) {
    rt.text(titlePassage.model[DEFAULT_LANGUAGE][i++]);
  }
  let finishTime = millis() + 1000 * SECONDS_FOR_TITLE;
  do {
    await sleep(1);
    if (standingOrder != "continue" && standingOrder != "pressing") {
      return Promise.reject(new Error(standingOrder));
    }
  }
  while ((standingOrder == "continue" || standingOrder == "pressing") && millis() < finishTime);
  phase = 2;
}

async function transFromTitles() {
  setStatusCaption(phase);
  fxSeconds = TITLES_FX_SECS;
  try {
    await titlePassage.drift(0, SINKING);
  } catch (err) {
    if (err.message == "previous" || err.message == "quit") {
      return Promise.reject(new Error(err.message));
    }
    standingOrder = handleInterruption(err, feedback);
  }
  phase = 3;
}

async function translationSurface() {
  setStatusCaption(phase);
  fxSeconds = SUFLOSI_FX_SECS;
  numberOfAudioCursors = 1;
  // make sure the titlePassage is cleared away:
  for (let rt of titlePassage.displayText) {
    rt.alpha(0);
  }
  await sleep(1);

  promises = [];
  stateHandler.setSurfacingState(surfacingLang,SURFACING);
  // opening up from blank, one time
  for (var p = 0; p < passages.length; p++) {
    captions[p].text(BUOYANCY_STRINGS[SURFACING] + "\nin " + surfacingLang);
    promises.push(passages[p].drift(0, SURFACING, surfacingLang)); // open in German
  }
  // info("gets here");
  // info("begin to surface (first Promise.all) in standingOrder: " + standingOrder);
  try {
    await Promise.all(promises);
  } catch(err) {
    return Promise.reject(new Error(err.message));
  }
  phase = 4;
  if (INSTALLED) {
    sLangIndex++;
    sLangIndex = sLangIndex > 2 ? 0 : sLangIndex;
    surfacingLang = LANGUAGES[sLangIndex];
  } else {
    surfacingLang = DEFAULT_LANGUAGE;
  }
}

// ----- MAIN AMBIENT FUNCTION -----
async function translationAmbient() {
  setStatusCaption(phase);
  numberOfAudioCursors = audioCursors.length;
  fxSeconds = SUFLOSI_FX_SECS;
  stateHandler.timeOfLastDramaticChange = millis();
  var sPromises, ambienceStartTime = millis(), ambience = INSTALLED ? millis() < (ambienceStartTime + AMBIENCE_TIME) : true;
  while ((standingOrder == "continue" || standingOrder == "pressing") && ambience) {
    sPromises = [];
    // TODO:
    stateHandler.changeTranslationState(); // was changeState_OB
    // var secondsToFinish = states_OB[statesNum_OB].seconds;
    // info("secondsToFinish: " + secondsToFinish);
    for (var p = 0; p < passages.length; p++) {
      let buoyancy = stateHandler.buoyancyOf(p);
      // info("bouyancy of " + p + " after changeState: " + buoyancy);
      let language = stateHandler.languageOf(p);
      captions[p].text(BUOYANCY_STRINGS[buoyancy] + "\nin " + language);
      sPromises.push(passages[p].drift(stateHandler.secondsToFinish, buoyancy, language)); // secondsToFinish, buoyancy, language
    }
    // info("states: " + JSON.stringify(prevStates) + "; " + "playCount: " + playCount);
    try {
      await Promise.all(sPromises);
    } catch(err) {
      return Promise.reject(new Error(err.message));
    }
    ambience = INSTALLED ? (millis() < (ambienceStartTime + AMBIENCE_TIME)) : true;
    info("ambience: " + ambience);
  } // END while
  phase = 5;
}

async function translationSink() {
  setStatusCaption(phase);
  numberOfAudioCursors = 1;
  // end with sinking
  fxSeconds = SUFLOSI_FX_SECS;
  promises = [];
  stateHandler.setBuoyancies(SINKING);
  for (var i = 0; i < passages.length; i++) {
    captions[i].text(BUOYANCY_STRINGS[SINKING]);
    promises.push(passages[i].drift(0, SINKING, stateHandler.languageOf(i)));
  }
  //
  try {
    await Promise.all(promises);
  } catch(err) {
    return Promise.reject(new Error(err.message));
  }
  phase = 6;
}

function handleInterruption(interruptError, feedback) {
  // info(interruption + " at beginning of handleInterruption");
  let newStandingOrder;
  let interruption = interruptError.message;
  switch (interruption) {
  case "continue":
    break;
  case "quit":
    phase = 6;
    newStandingOrder = "quit";
    cleanUpAndQuit();
    break;
  case "next":
    phase++;
    // bumpPhase(1);
    newStandingOrder = "continue";
    break;
  case "previous":
    phase--;
    if (phase == 2 || phase < 0) phase = 0;
    // else bumpPhase(-1);
    newStandingOrder = "continue";
    break;
  case "surface":
    phase = 3;
    newStandingOrder = "continue";
    break;
  default:
    info(interruptError);
    console.log(interruptError.stack);
    noLoop();
    throw new Error(interruption);
  }
  setStatusCaption(phase);
  if (feedback) showStatusUntil = millis() + 3000;
  // info(standingOrder + " at end of handleInterruption");
  return newStandingOrder;
}

function cleanUpAndQuit() {
  for (let i = 0; i < captions.length; i++) {
    captions[i].text("");
  }
  withAudio = false;
  paused = true;
  setStatusCaption(phase)
  noLoop();
  draw();
}

function keyPressed() {
  info("---- key press ----");
  feedback = true;
  switch (keyCode) {
  case 32: // space
    standingOrder = "continue";
    toggleAudio(paused);
    break;
  case 37: // left arrow
    standingOrder = "previous";
    break;
  case 39: // right arrow
    standingOrder = "next";
    break;
  case 68: // d
    if (keyIsDown(OPTION) || keyIsDown(ALT)) surfacingLang = "dp";
    else surfacingLang = "de";
    standingOrder = "surface";
    break;
  case 69: // e
    if (keyIsDown(OPTION) || keyIsDown(ALT)) surfacingLang = "ep";
    else surfacingLang = "en";
    standingOrder = "surface";
    break;
  case 70: // f
    if (keyIsDown(OPTION) || keyIsDown(ALT)) {
      surfacingLang = "fp";
    } else {
      surfacingLang = "fr";
    }
    standingOrder = "surface";
    break;
  case 81: // q
    standingOrder = "quit";
    break;
  default:
    feedback = false;
  }
}

function setStatusCaption(phase) {
  let ps = paused ? " - audio paused" : " - audio on";
  // ps += ", scIndex: " + scIndex + ", phase: " + phase;
  // info("gets here with phase: " + phase + " " + statusCaptions[phase]);
  let newStatusCap = statusCaptions[phase];
  statusCaption.text(newStatusCap + (newStatusCap == "translation quit" ? "" : ps));
}

// ---- DRAWING FUNCTIONS ----
function draw() {
  background(BACKGROUND);

  if (!paused) {
    for (let i = 0; i < numberOfAudioCursors; i++) {
      if (audioCursors[i]) audioCursors[i].update();
    }
  }

  if (phase > 2) drawImages();

  if (keyIsDown(16) || standingOrder == "quit" || standingOrder == "pressing") {
    if (phase > 2) {
      for (let caption of captions) {
        caption.alpha(95);
      }
    }
    statusCaption.alpha(95);
    cursor();
  } else {
    for (let caption of captions) {
      caption.alpha(0);
    }
    statusCaption.alpha(0);
    if (PRODUCTION) noCursor();
  }

  if (millis() < showStatusUntil) statusCaption.alpha(95);

  RiText.drawAll();
}

function drawImages() {
  let ix = IMG_X, iy = TEXT_Y - (FONT_SIZE - 2);
  for (let passage of passages) {
    for (let fxImages of passage.displayImages) {
      for (let fxImage of fxImages) {
        fxImage.update();
        image(fxImage.displayImage,ix,iy,imageWidth*.48,imageHeight*.45);
        ix += 12;
      }
      ix = IMG_X;
      iy += LEADING;
    }
    iy += LEADING;
  }
}

// ----- PASSAGE obect FUNCTIONS -----
var Passage = function Passage(buoyancy, language) {
  this.buoyancy = (buoyancy === undefined) ? 1 : buoyancy;
  this.language = DEFAULT_LANGUAGE;
  this.model = {}; // per language
};

Passage.prototype.drift = async function (seconds, buoyancy, language) {
  this.language = language || DEFAULT_LANGUAGE;
  this.buoyancy = (buoyancy === undefined) ? 1 : buoyancy;
  let finish = millis() + seconds * 1000;
  let done = false;
  do {
    let rndIndexes = rndIndex(this.model[this.language]);
    // info(rndIndexes);
    for (let l = 0; l < this.model[this.language].length; l++) {
      let rl = rndIndexes[l];
      let modelLetters = this.model[this.language][rl].split("");
      let displayLetters = this.displayText[rl].text().split("");
      var previousLetters = [];
      NEXT_letter: for (let i = 0; i < modelLetters.length; i++) {
        previousLetters.push(displayLetters[i]);
        let diff, theCase;
        switch (this.buoyancy) {
        case FLOATING:
          // do nothing if SPC's are matching
          if (modelLetters[i] === SPC && displayLetters[i] === SPC) continue NEXT_letter;
          // if heads address a space on the displayText that could be a letter
          if (modelLetters[i] !== SPC && (displayLetters[i] === SPC && heads())) {
            // on heads, makes it a model[this.language] letter
            if (heads()) displayLetters[i] = modelLetters[i];
            else {
              // floating, so on tails make it the alternate
              displayLetters[i] = (modelLetters[i] in literalAlts[this.language] ? literalAlts[this.language][modelLetters[i]] : displayLetters[i]);
            }
            break;
          }
          // check to see if displayText letter is in the alternates table handles SPC in displayText
          if (!(displayLetters[i] in literalAlts[this.language])) break;
          // on heads, if the model[this.language] letter is a space make this so in displayText
          if ((modelLetters[i] === SPC) && heads()) {
            displayLetters[i] = SPC;
            break;
          }
          // in all other cases, on heads get alternate for what is there
          if (heads()) {
            // if (displayLetters[i] === "i") info("alt for i:" + literalAlts[this.language][modelLetters[i]]);
            // info("displayLetter before: " + displayLetters[i]);
            displayLetters[i] = literalAlts[this.language][displayLetters[i]];
            // info("displayLetter after: " + displayLetters[i]);
          } else {
            // on tails get the model letter
            displayLetters[i] = modelLetters[i];
          }
          break;
        case SINKING:
          diff = diffFactor(modelLetters, displayLetters, this.buoyancy);
          if (displayLetters[i] === SPC) continue NEXT_letter;
          if (!(modelLetters[i] in literalAlts[this.language])) {
            if (getRndInteger(0, diff < .3 ? 0 : 1) == 0) displayLetters[i] = SPC;
            continue NEXT_letter;
          }
          // emulating, but improving translation
          theCase = getRndInteger(1,Math.floor(18 * diff + 2));
          switch (theCase) {
          case 1:
          case 2:
            displayLetters[i] = SPC;
            break;
          case 3:
            displayLetters[i] = (modelLetters[i] in literalAlts[this.language]) ? literalAlts[this.language][modelLetters[i]] : SPC;
            break;
          case 4:
            displayLetters[i] = modelLetters[i];
          }
          break;
        case SURFACING:
        if (displayLetters[i] === modelLetters[i]) continue NEXT_letter;
          if (displayLetters[i] === SPC) {
            // info(Math.floor(7 * diffFactor(modelLetters, displayLetters)));
            if  (getRndInteger(0,Math.floor(7 * diffFactor(modelLetters, displayLetters, this.buoyancy))) == 0) {
              // info("handling SPC with odds: " + Math.floor(7 * diffFactor(modelLetters, displayLetters)));
              if (heads() || (diffFactor(modelLetters, displayLetters, this.buoyancy) < .1)) displayLetters[i] = modelLetters[i];
              else displayLetters[i] = (modelLetters[i] in literalAlts[this.language]) ? literalAlts[this.language][modelLetters[i]] : modelLetters[i];
            }
          } else {
            if (heads() || (diffFactor(modelLetters, displayLetters, this.buoyancy) < .4)) displayLetters[i] = modelLetters[i];
          }
        }
        if (standingOrder != "continue" && standingOrder != "pressing") {
          // make sure concurrent Promises resolve
          await sleep(fxSeconds * 1.5);
          return Promise.reject(new Error(standingOrder));
        }
      } // NEXT_letter
      if (phase > 2) {
        // info("line " + rl + ": " + displayLetters[0]);
        for (let wi = 0; wi < displayLetters.length; wi++) {
          if (displayLetters[wi] !== previousLetters[wi]) {
            let previousLetter = ABC.includes(previousLetters[wi]) ? previousLetters[wi] : literalAlts[this.language][previousLetters[wi]];
            let displayLetter = ABC.includes(displayLetters[wi]) ? displayLetters[wi] : literalAlts[this.language][displayLetters[wi]];
            let fromImage = correlativeImages[this.language][ABC.indexOf(previousLetter)];
            let toImage = correlativeImages[this.language][ABC.indexOf(displayLetter)];
            this.displayImages[rl][wi].xFade(fxSeconds,toImage,fromImage);
          }
        }
      }
      textTo(this.displayText[rl],displayLetters.join(""),fxSeconds, true);
      // info("awaiting begins for " + xfpromises.length);
      await sleep(fxSeconds * 1.2);
      // info("awaiting over");
    } // NEXT_line
    // figure out if we should keep going
    done = (standingOrder != "continue" && standingOrder != "pressing") ? true : false;
    if (!done)
      done = (seconds > 0) && (millis() > finish);
    if (!done) {
      done = (this.buoyancy == SURFACING || this.buoyancy == SINKING);
      done = (done) ? passagesMatch(this.model[this.language],this.displayText,this.buoyancy) : false;
    }
  } // do
  while (!done);
};

// ---- GENERAL PURPOSE FUNCTIONS -----
function diffFactor(model, displayText, buoyancy) {
  buoyancy = buoyancy || SURFACING; // NB: excludes the possibility of FLOATING
  let diff = 0, len = model.length;
  for (let i = 0; i < len; i++) {
    if (buoyancy == SURFACING)
      diff += (displayText[i] !== model[i] ? 1 : 0);
    else
      diff += (displayText[i] !== SPC ? 1 : 0);
  }
  return diff / len;
}

function getRndInteger(min, max) {
  return Math.floor(Math.random() * (max - min + 1) ) + min;
}

function heads() {
  return getRndInteger(0,1) === 0;
}

function info(msg) {
  console.log("[INFO] " + msg);
}

// utility for translation only, returns int: 0-27; ABC is global
function letterNumAt(p,l,x) {
  return ABC.indexOf(charAt(p,l,x));
}

// function letterNumAtWas(p,l,x) {
//   return ABC.indexOf(charAtWas(p,l,x));
// }

function charAt(p,l,x) {
  // info("passage: " + p + " line: " + l + " displayText: " + passages[p].displayText[l]);
  return passages[p].displayText[l].charAt(x);
}

function charAtWas(p,l,x,language) {
  return passages[p].model[language][l].charAt(x);
}

function charIsInflected(p,l,x,language) {
  return (passages[p].displayText[l].charAt(x) !== charAtWas(p,l,x,language));
}

function fillWithSpaces(rt) {
  rt.text(rt.text().replace(/./gi,SPC));
}

function passagesMatch(modelPassage, displayPassage, buoyancy) {
  let result = true;
  switch (buoyancy) {
  case SURFACING:
    for (let i = 0; i < modelPassage.length; i++) {
      if (modelPassage[i] !== displayPassage[i].text())
        return false;
    }
    break;
  case SINKING:
    for (let rt of displayPassage) {
      let chars = rt.text().split("");
      for (let char of chars) {
        if (char !== SPC) return false;
      }
    }
  }
  return result;
}

// function rateWithBase(BASE_NOTE,noteNum) {
//   let step = Math.abs(BASE_NOTE - noteNum);
//   let factor = Math.pow(2,step/12);
//   return (noteNum < BASE_NOTE) ? 1 / factor : 1 * factor;
// }

function rndIndex(a) {
  let ints = [];
  for (let i = 0; i < a.length; i++) {
    ints.push(i);
  }
  return ints.shuffle();
}

// a general utility fuction for p5 Images
function replacePixels(existing, replaceWith) {
  existing.loadPixels();
  replaceWith.loadPixels();
  // for (var p = 0; p < 4 * (existing.width * existing.height); p++) {
  //   existing.pixels[p] = replaceWith.pixels[p];
  // }
  let p = 0;
  for (let pixel of replaceWith.pixels) {
    existing.pixels[p++] = pixel;
  }
  existing.updatePixels();
}

Array.prototype.shuffle = function() {
  // var input = this;
  for (let i = this.length-1; i >=0; i--) {
    let randomIndex = Math.floor(Math.random()*(i+1));
    let itemAtIndex = this[randomIndex];
    this[randomIndex] = this[i];
    this[i] = itemAtIndex;
  }
  return this;
};

async function sleep(s) {
  return new Promise(resolve => setTimeout(resolve, s * 1000));
}

// ---- requires RiTexts -----
function textTo(rt, newWord, seconds, fullOn) {
  if (rt.text() === newWord) return;
  // let temp = rt.copy();
  rt.fadeFromText.text(rt.text());
  var originalAlpha = rt.alpha();
  // ensures that fade-in goes to 255
  if (fullOn) originalAlpha = 255;
  rt.fadeFromText.alpha(originalAlpha);
  // make original invisible leaving copy
  rt.alpha(0);
  // put new text into the invisible original
  rt.text(newWord);
  // fade out the copy
  rt.fadeFromText.colorTo([rt._color.r, rt._color.g, rt._color.b, 0], seconds);
  // fade in the orginal with new text
  rt.colorTo([rt._color.r, rt._color.g, rt._color.b, originalAlpha], seconds * .3);
}

function toggleAudio(p) {
  if (p) {
    paused = false;
    withAudio = true;
    for (let ac of audioCursors) {
      replacePixels(ac.cursorImage,cursorImages[letterNumAt(ac.p, ac.l, ac.x)]);
      replacePixels(ac.cursorUnder,passages[ac.p].displayImages[ac.l][ac.x].displayImage);
      replacePixels(passages[ac.p].displayImages[ac.l][ac.x].displayImage, ac.cursorImage);
      ac.lastStep = millis();
    }
    // for (var i = 0; i < audioCursors.length; i++) {
    //   audioCursors[i].lastStep = millis();
    // }
    // info("gets here first: " + getAudioContext().state);
    if (Tone.context.state !== "running") {
      Tone.context.resume();
    }
  } else {
    paused = true;
    withAudio = false;
    for (let ac of audioCursors) {
      replacePixels(passages[ac.p].displayImages[ac.l][ac.x].displayImage, ac.cursorUnder);
    }
    for (let sound of sounds) {
      sound.stop();
    }
    // for (var i = 0; i < audioCursors.length; i++) {
    //   replacePixels(passages[audioCursors[i].p].displayImages[audioCursors[i].l][audioCursors[i].x].displayText, audioCursors[i].cursorUnder);
    // }
  }
  setStatusCaption(phase);
}

// ---- OBJECTS wrapping p5 Images ----

// ---- FXImage -----
var FXImage = function FXImage(fromImage, toImage) {
  this.startTime = -1; // -1
  this.duration = -1; // -1
  this.w = fromImage ? fromImage.width : imageWidth;
  this.h = fromImage ? fromImage.height : imageHeight;
  this.from = createImage(this.w, this.h);
  this.displayImage = createImage(this.w, this.h);
  if (fromImage) {
    replacePixels(this.from, fromImage);
    replacePixels(this.displayImage, fromImage);
  }
  this.to = createImage(this.w, this.h);
  if (toImage) replacePixels(this.to, toImage);
};

FXImage.prototype.update = function() {
  // TODO: make this work with AudioCursor
  if (this.startTime == -1) {
    return;
  } else if (millis() > (this.startTime + this.duration)) {
    this.startTime = -1;
    return;
  }
  this.displayImage.loadPixels();
  this.from.loadPixels();
  this.to.loadPixels();
  var xFactor = map(millis(),this.startTime, this.startTime + this.duration, 0, 1);
  xFactor = constrain(xFactor, 0, 1);
  // info(xFactor);
  for (let p = 0; p < 4 * (this.w * this.h); p += 4) {
    for (let c = 0; c < 3; c++) {
      let f = this.from.pixels[p+c], t = this.to.pixels[p+c];
      this.displayImage.pixels[p+c] = xFactor * t + (1 - xFactor) * f;
    }
  }
  this.displayImage.updatePixels();
};

FXImage.prototype.shutter = function() {
  this.displayImage.loadPixels();
  for (let p = 0; p < 4 * (this.w * this.h); p += 4) {
    for (let c = 0; c < 3; c++) {
      this.displayImage.pixels[p+c] = 0;
    }
  }
  this.displayImage.updatePixels();
};

FXImage.prototype.xFade = function(duration, toImage, fromImage) {
  this.startTime = millis();
  this.duration = duration * 1000;

  // NEW
  replacePixels(this.to, toImage);
  if (fromImage) {
    // info["fromImage was passed"];
    replacePixels(this.from, fromImage);
    replacePixels(this.displayImage, fromImage);
  } else {
    replacePixels(this.from, this.displayImage);
  }
};

// ----- AudioCursor (with Visual Behavior) -----
var AudioCursor = function AudioCursor(speed,p,l,x,cursorImage) {
  this.lastStep = millis();
  this.firstMove = true;
  this.speed = speed || 1.5;
  this.p = p || 0;
  this.l = l || 0;
  this.x = x || 0;
  this.language = DEFAULT_LANGUAGE;
  this.w = cursorImage ? cursorImage.width : imageWidth;
  this.h = cursorImage ? cursorImage.height : imageHeight;
  // info(cursorImages[letterNumAt(this.p,this.l,this.x)].width);
  this.cursorImage = createImage(this.w, this.h);
  this.cursorUnder = createImage(this.w, this.h);
  // replacePixels(this.cursorImage,cursorImage || cursorImages[letterNumAt(this.p,this.l,this.x)]);
  // replacePixels(this.cursorUnder,passages[this.p].displayImages[this.l][this.x].displayText);
  // replacePixels(passages[this.p].displayImages[this.l][this.x].displayText,this.cursorImage);
};

AudioCursor.prototype.update = function() {
  // is it time to step onwards?
  if (millis() > this.lastStep + this.speed * 1000) {
    // put back the underlying image:
    replacePixels(passages[this.p].displayImages[this.l][this.x].displayImage, this.cursorUnder);
    // moving to next cursor position first time
    this.x++;
    if (this.x >= passages[this.p].displayImages[this.l].length) {
      this.x = 0;
      this.l++;
      if (this.l >= passages[this.p].displayImages.length) {
        this.l = 0;
        this.p++;
        if (this.p >= passages.length) this.p = 0;
      }
    }
    // set aside the new underlying image
    replacePixels(this.cursorUnder,passages[this.p].displayImages[this.l][this.x].to);
    let letter = charAt(this.p,this.l,this.x);
    let letterNum = letterNumAt(this.p,this.l,this.x);
    let letterWas = charAtWas(this.p,this.l,this.x,passages[this.p].language);
    let altLetterNum = ABC.indexOf(literalAlts[passages[this.p].language][letter]);
    let buoyancy = stateHandler.prevBuoyancyOf(this.p); // prevStates[this.p];
    // get the appropriate letter-determined cursor image

    // get new cursor image checking that the letter is one of lower case 26
    let newCursorImage = ABC.includes(letter) ? cursorImages[letterNum] : cursorImages[altLetterNum];
    // TODO: check this? OB only? or wave image if floating
    if (buoyancy == FLOATING && letterNum != SPC_NUM) {
      // info("this.p: " + this.p + " buoyancy: " + buoyancy + " letterNum: " + letterNum + " altLetterNum: " + altLetterNum);
      newCursorImage = correlativeImages[passages[this.p].language][altLetterNum];
    }
    // replace the pixels here
    if (newCursorImage === undefined) info("language: " + passages[this.p].language + " letter: " + letter + " altLetter: " + literalAlts[passages[this.p].language][letter]);
    replacePixels(this.cursorImage,newCursorImage);
    // -- audio behavior --
    if (withAudio) {
      this.language = passages[this.p].language;
      if (!ABC.includes(letter)) {
        letterNum = altLetterNum;
        letter = literalAlts[this.language][letter];
      }
      doAudioBehavior(this, buoyancy, this.language, letterNum, letterWas, letter);
    }
    // displayText the cursor image at the current position:
    replacePixels(passages[this.p].displayImages[this.l][this.x].displayImage, this.cursorImage);
    //
    this.lastStep = millis();
  }
};

function doAudioBehavior(audioCursor, buoyancy, language, letterNum, letterWas, letter) {
  let inflected = charIsInflected(audioCursor.p,audioCursor.l,audioCursor.x,audioCursor.language);
  // [inflected ? "lo" : "hi"]
  let whichSound, pan;
  // TODO: set playBell according to buoyancy
  switch (buoyancy) {
  case FLOATING:
    bellVeloc = .7;
    bellsustainedVeloc = 1;
    break;
  case SURFACING:
    bellVeloc = 1;
    bellsustainedVeloc = 1;
    break;
  case SINKING:
    bellVeloc = .2;
    bellsustainedVeloc = 1;
  }
  let languagePitchShift = 0
  switch (language) {
    case "de":
      whichSound = "voice";
      pan = 0;
      break;
    case "dp":
      whichSound = "bell";
      pan = 0;
      break;
    case "fr":
      whichSound = "voice";
      languagePitchShift = 1;
      pan = -.9;
      break;
    case "fp":
      whichSound = "bell";
      languagePitchShift = 1;
      pan = -.7;
      break;
    case "en":
      whichSound = "voice";;
      languagePitchShift = -1;
      pan = .9;
      break;
    case "ep":
      whichSound = "grin";;
      languagePitchShift = -1;
      pan = .7;
      break;
  }
  if (letterNum > SPC_NUM) {
    // not a space
    // let bellRate = rateWithBase(BASE_NOTE,midinote); // map(midinote,22,85,.45,16);
    let midinote;
    let instrument;
    switch (whichSound) {
    case "voice":
      instrument = langSounds[language][letterNum - 1];
      midinote = 60 + languagePitchShift;
      break;
    case "bell":
      instrument = bell;
      // info("language: " + language + " inflected: " + inflected + " letter: " + letter);
      midinote = parseInt(letternotes[language][letter]) + languagePitchShift;
      break;
    case "grin":
      instrument = grin;
      midinote = parseInt(letternotes[language][letter]) + languagePitchShift;
      break;
    default:
      instrument = langSounds[language][letterNum - 1];
      midinote = 60 + languagePitchShift;
    }
    midinote = (buoyancy == SINKING) ? midinote - 4 : midinote;
    //
    // let source = makeSource(instrument,pan);
    // playSource(source);
    playSound(instrument,midinote,pan);
    // ——— VOLUME ———
    // sound.setVolume(bellVeloc, (buoyancy == SINKING) ? 3 : 1 );
    // if (inflected) {
    //   // sustained for 2 seconds
    //   sound.setVolume(bellsustainedVeloc,1);
    //   playSound(sound,midinote,pan);
    //   // bellsustained.play(0,bellRate);
    //   playCount++;
    // } else {
    //   playSound(sound,midinote,pan);
    //   // bell.play(0,bellRate); // play(now,at rate)
    //   playCount++;
    // }
  } else { // SPC:
    // ——— VOLUME ———
    // rolls.setVolume(rollVeloc,2);
    // if (letterWas == SPC) {
    //   // if (was an original space) rising or lowering rolls:
    //   var rollNote = getRndInteger(rollLo,rollHi);
    //   var endNote = rollNote + 5;
    //   if (breathin) {
    //     // info(BUOYANCY_STRINGS[buoyancy] + " rising in-breath space");
    //     for (var delay = 0; delay < SUFLOSI_FX_SECS * 5; delay+= SUFLOSI_FX_SECS) {
    //       // rollrate = rateWithBase(BASE_NOTE,rollNote + bend);
    //       // rolls.play(bend,rollrate);
    //       playSound(rolls,rollNote++, delay);
    //       // bend++; // up one semitone
    //       playCount++;
    //     }
    //   } else {
    //     // info(BUOYANCY_STRINGS[buoyancy] + " falling out-breath space");
    //     rollNote = endNote;
    //     for (delay = 0; delay < SUFLOSI_FX_SECS * 5; delay+= SUFLOSI_FX_SECS) {
    //       // rollrate = rateWithBase(BASE_NOTE,rollNote - bend);
    //       // rolls.play(bend,rollrate);
    //       playSound(rolls,rollNote--, delay);
    //       // bend--;
    //       playCount++;
    //     }
    //   }
    //   // breathin = !breathin; // if breathing is based on hitting a space
    // } else {
    //   // not a space in the origText
    //   // info(BUOYANCY_STRINGS[buoyancy] + " non-original space");
    //   rollNote = getRndInteger(rollLo,rollHi);
    //   playSound(rolls,rollNote);
    //   // rollrate = rateWithBase(BASE_NOTE,rollNote);
    //   // rolls.play(0,rollrate);
    // } // letterWas originally space
  } // SPC endif
}

// function makeSource(instrument, pan) {
//   pan = pan || 0;
//   let source = audioContext.createBufferSource();
//   let panNode = audioContext.createStereoPanner();
//   source.buffer = instrument.buffer;
//   source.connect(panNode);
//   panNode.pan.value = pan;
//   panNode.connect(audioContext.destination);
//   return source;
// }

// function playSource(source, midinote) {
//   source.playbackRate.value = Math.pow(SEMITONE_RATIO, midinote - BASE_NOTE);
//   source.start(0);
// }

function playSound(instrument,midinote,pan,atTime) {
  pan = pan || 0;
  // atTime = (atTime === undefined) ? 0 : audioContext.currentTime + atTime / 1000;
  let sound, channel;
  if (browser.mobile) {
    // info("mobile audio context running? " + (Tone.context.state === "running"));
    sound = new Tone.Player(instrument.buffer).toMaster();
  } else {
    if (browser.name == "safari") {
      sound = new Tone.Player(instrument.buffer).toMaster();
    } else {
      channel = new Tone.Channel(0,pan).connect(compressor).toMaster();
      // info("should be panning: " + channel.pan.value);
      sound = new Tone.Player(instrument.buffer);
      sound.chain(channel);
    }
  }
  sound.playbackRate = Math.pow(SEMITONE_RATIO, midinote - BASE_NOTE);
  sound.start();
}

function preTonePlaySound(instrument,midinote,pan,atTime) {
  pan = pan || 0;
  atTime = (atTime === undefined) ? 0 : audioContext.currentTime + atTime / 1000;
  let source = audioContext.createBufferSource();
  source.buffer = instrument.buffer;
  source.playbackRate.value = Math.pow(SEMITONE_RATIO, midinote - BASE_NOTE);
  if (mobileDetector.mobile() == null) {
    // info("playing with pan")
    let panNode = audioContext.createStereoPanner();
    panNode.pan.value = pan;
    source.connect(panNode);
    panNode.connect(compressor);
  } else {
    source.connect(audioContext.destination);
  }
  // source.detune.value = semitones * 100;
  source.start(atTime);
}
