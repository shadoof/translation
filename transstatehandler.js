const states_OB = [
  {state:[1, 1, 1, 1], seconds:36},
  {state:[1, 1, 1, 0], seconds:27},
  {state:[0, 1, 1, 1], seconds:27},
  {state:[1, 1, 0, 0], seconds:18},
  {state:[0, 0, 1, 1], seconds:18},
  {state:[1, 0, 0, 0], seconds:9},
  {state:[0, 0, 0, 1], seconds:9},
  {state:[0, 0, 0, 0], seconds:9}
];

const LCODES = ["a", "b", "c", "d", "e", "f"];

const DRAMA_INTERVALS = [120, 150, 180];

var statesNum_OB = 0;

var StateHandler = function StateHandler(riGrammar, stateString) {
  this.stateString = stateString || "00001111";
  this.NUM_ITEMS = 4;
  this.secondsToFinish = 20;
  this.secondsToDrama = DRAMA_INTERVALS[getRndInteger(0,2)];
  // this.LANGUAGES = ["de","fr","en"];
  this.prevStateStrings = [this.stateString, this.stateString, this.stateString];
  this.timeOfLastChnage = millis();
  this.timeOfLastDramaticChange = millis();
  this.stateGrammar = riGrammar;
  // info("00: " + this.stateGrammar.expandFrom("00"));
}

// -- STATE CHANGING METHODS --

StateHandler.prototype.changeTranslationState = function() {
  let newStateString = "", newBuoyancyString = "", buoyancyKey, langKey, newSecondsToFinish = 10; // 20
  if (this.dramaticChange()) {
    info("dramatic");
    // assemble newStateString
    // language
    let langNum, buoyancy, lang;
    do {
      langNum = getRndInteger(0,5);
      lang = LANGUAGES[langNum];
    }
      while (this.langNotInPassages(lang));
    for (let i = 0; i < this.NUM_ITEMS; i++) newStateString += langNum.toString();
    // buoyancy
    do {
      buoyancy = getRndInteger(0,2);
    }
      while (this.buoyancyNotInPassages(buoyancy));
    for (let i = 0; i < this.NUM_ITEMS; i++) {
      newStateString += buoyancy.toString();
      // and calculate newSecondsToFinish
      // add 5 for every surfacing passage
      if (buoyancy == 1) newSecondsToFinish += 5;
      // add 2.5 for every sinking passage
      if (buoyancy == 2) newSecondsToFinish += 2.5;
    }
    // set new secondsToFinish
    this.secondsToFinish = newSecondsToFinish * 1.6; // newSecondsToFinish;
    // reset the timeOfLastDramaticChange
    this.secondsToDrama = DRAMA_INTERVALS[getRndInteger(0,2)];
    this.timeOfLastDramaticChange = millis();
  } else {
    // assemble newStateString
    // languages:
    for (let i = 0; i < this.NUM_ITEMS; i++) {
      buoyancyKey = LCODES[parseInt(this.prevStateStrings[0].substr(i + this.NUM_ITEMS, 1))]
      + LCODES[parseInt(this.prevStateStrings[1].substr(i + this.NUM_ITEMS, 1))];
      langKey = buoyancyKey + LCODES[LANGUAGES.indexOf(passages[i].language)];
			// collect the new language state from the grammar
      newStateString += this.stateGrammar.expandFrom("<" + langKey + ">");
      // info("langKey: " + langKey + " newStateString: " + newStateString);
			// passageLang[i] = Integer.parseInt(grammar.expandFrom(langKey));
      // buoyancy
      let newBuoyancy = this.stateGrammar.expandFrom("<" + buoyancyKey + ">");
      newBuoyancyString += newBuoyancy;
      newBuoyancy = parseInt(newBuoyancy);
      // and calculate newSecondsToFinish
      // add 5 for every surfacing passage
      if (newBuoyancy == 1) newSecondsToFinish += 5;
      // add 2.5 for every sinking passage
      if (newBuoyancy == 2) newSecondsToFinish += 2.5;
    }
    newStateString = newStateString + newBuoyancyString;
    this.secondsToFinish = newSecondsToFinish; // newSecondsToFinish;
  }
  // always reset the timeOfLastChange
  this.timeOfLastChange = millis();
  // set new state and push to previous states
  this.stateString = newStateString;
  this.pushState(newStateString);
  // HACK reduce numberOfAudioCursors to 1 if all passages surfacing
  if (this.stateString.substr(this.NUM_ITEMS,this.NUM_ITEMS) == "1111") {
    // info("one audioCursor");
    numberOfAudioCursors = 1;
  } else {
    numberOfAudioCursors = audioCursors.length;
  }
  info("newStateString: " + newStateString + " prevStateString: " + this.prevStateStrings[1] + " langKey: " + langKey + " secondsToFinish: " + this.secondsToFinish + " time to drama: " + (this.timeOfLastDramaticChange + (this.secondsToDrama * 1000) - millis()) / 1000);
}

StateHandler.prototype.addBuoyancySeconds = function(seconds) {
  return result;
}

StateHandler.prototype.langNotInPassages = function(lang) {
  let result = true;
  for (let i = 0; i < this.NUM_ITEMS; i++)
    if (LANGUAGES[parseInt(this.stateString.substr(i,1))] == lang) result = false;
  return result;
}

StateHandler.prototype.buoyancyNotInPassages = function(buoyancy) {
  let result = true;
  for (let i = 0; i < this.NUM_ITEMS; i++)
    if (parseInt(this.stateString.substr(i + this.NUM_ITEMS,1)) == buoyancy) result = false;
  return result;
}
StateHandler.prototype.dramaticChange = function() {
  return millis() > (this.timeOfLastDramaticChange + this.secondsToDrama * 1000);
}

StateHandler.prototype.changeState_OB = function() {
  // reproduces the logic of the
  // QuickTime version of overboard
  var newStateString = "";
  statesNum_OB = getRndInteger(0,7);
  this.secondsToFinish = states_OB[statesNum_OB].seconds;
  // languages
  for (var p = 0; p < this.NUM_ITEMS; p++) {
    let newLanguage = getRndInteger(0, LANGUAGES.length - 1).toString();
    newStateString += newLanguage;
  }
  // bouyancies
  for (var p = 0; p < this.NUM_ITEMS; p++) {
    var newBuoyancy = states_OB[statesNum_OB].state[p];
    // info("p: " + p + " prevBuoyancy: " + prevBuoyancy + " new: " + newBuoyancy);
    if (newBuoyancy > 0) {
      switch (this.prevBuoyancyOf(p)) {
        case 0:
        newBuoyancy = newBuoyancy + getRndInteger(0,1);
        break;
        case 1:
        newBuoyancy = 2;
        break;
        case 2:
        newBuoyancy = 1;
      }
    }
    newStateString += newBuoyancy.toString();
  }
  this.stateString = newStateString;
  // info("newStateString: " + newStateString);
  this.pushState(newStateString);
}

// -- GENERAL METHODS --
StateHandler.prototype.buoyancyOf = function(passage) {
  return parseInt(this.stateString.substr(passage + this.NUM_ITEMS,1));
}

StateHandler.prototype.languageOf = function(passage) {
  return LANGUAGES[this.stateString.substr(passage,1)];
}

StateHandler.prototype.prevBuoyancyOf = function(passage) {
  return parseInt(this.prevStateStrings[0].substr((this.NUM_ITEMS + passage), 1));
}

StateHandler.prototype.pushState = function(newStateString) {
  // info("before: " + this.prevStateStrings);
  // info("before: " + this.prevStateStrings[0]);
  this.prevStateStrings.pop();
  this.prevStateStrings.unshift(newStateString);
  // info("after: " + this.prevStateStrings);
  // info("after: " + this.prevStateStrings[0]);
}

StateHandler.prototype.setBuoyancies = function(bouyancy) {
  this.stateString = this.stateString.substring(0,this.NUM_ITEMS) + bouyancy.toString().repeat(this.NUM_ITEMS);
  this.pushState(this.stateString);
}

StateHandler.prototype.setSurfacingState = function(language, bouyancy) {
  this.stateString = LANGUAGES.indexOf(language).toString().repeat(this.NUM_ITEMS) + bouyancy.toString().repeat(this.NUM_ITEMS);
  this.pushState(this.stateString);
}
