(function() {
  'use strict';
  var AudioContext = window.AudioContext || window.webkitAudioContext || false;

  // Default settings
  var BPM = 120;
  var TICKS = 16;
  var soundPrefix = 'https://blog.omgmog.net/beatmaker/sounds/';
  var sounds = [
    'bass_drum.wav',
    'snare_drum.wav',
    'low_tom.wav',
    'mid_tom.wav',
    'hi_tom.wav',
    'rim_shot.wav',
    'hand_clap.wav',
    'cowbell.wav',
    'cymbal.wav',
    'o_hi_hat.wav',
    'cl_hi_hat.wav',
    'low_conga.wav',
    'mid_conga.wav',
    'hi_conga.wav',
    'claves.wav',
    'maracas.wav',
    'custom1.wav', // Placeholder for custom sound 1
    'custom2.wav'  // Placeholder for custom sound 2
  ];
  
  // Human-readable names for the instruments
  var instrumentNames = [
    'BASS DRUM',
    'SNARE DRUM',
    'LOW TOM',
    'MID TOM',
    'HI TOM',
    'RIM SHOT',
    'HAND CLAP',
    'COWBELL',
    'CYMBAL',
    'OPEN HI-HAT',
    'CLOSED HI-HAT',
    'LOW CONGA',
    'MID CONGA',
    'HI CONGA',
    'CLAVES',
    'MARACAS',
    'CUSTOM 1',
    'CUSTOM 2'
  ];
  
  var buffers = {};
  var context;
  var isPlaying = false; // Start paused
  var interval;
  var currentTick = 0;
  var lastTick = TICKS - 1;
  var currentSection = 'main';
  var sections = {
    main: {},
    intro: {},
    verse: {},
    chorus: {},
    outro: {}
  };
  var customSounds = {
    custom1: null,
    custom2: null
  };
  var clipboardSection = null;
  var notificationTimeout = null;
  var audioEffects = {
    delay: {
      active: false,
      time: 0,
      feedback: 0,
      node: null
    },
    reverb: {
      active: false,
      size: 0,
      mix: 0,
      node: null,
      buffer: null
    },
    filter: {
      active: false,
      cutoff: 20000,
      q: 0,
      node: null
    },
    compressor: {
      active: false,
      threshold: 0,
      ratio: 1,
      node: null
    }
  };
  
  // MIDI Keyboard variables
  var currentOctave = 4;
  var midiKeyboard = null;
  var activeKeys = new Set();
  var keyboardHold = false;
  var currentPreset = 'synth';
  var keyMapping = {
    'a': 60, // C4
    'w': 61, // C#4
    's': 62, // D4
    'e': 63, // D#4
    'd': 64, // E4
    'f': 65, // F4
    't': 66, // F#4
    'g': 67, // G4
    'y': 68, // G#4
    'h': 69, // A4
    'u': 70, // A#4
    'j': 71, // B4
    'k': 72  // C5
  };
  var notesPlaying = {};
  var oscillators = {};
  
  // Mobile variables
  var isMobile = false;
  var currentPage = 0;
  var pagesPerRow = 2; // For mobile view, we'll show 8 columns at a time (TICKS/pagesPerRow)
  var visibleInstrument = 0; // For mobile view, track which instrument is visible
  var gridRowCount = sounds.length;
  
  // Check if device is touch-enabled or small screen
  if ('ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth <= 768) {
    document.body.classList.add('touch-device');
    isMobile = window.innerWidth <= 768;
  }
  
  // Initialize audio context
  if (AudioContext) {
    context = new AudioContext();
  }

  // Initialize UI elements
  var $grid = document.getElementById('beat-grid');
  var $tempoValue = document.getElementById('tempo-value');
  var $tempoSlider = document.getElementById('tempo-slider');
  var $tempoUp = document.getElementById('tempo-up');
  var $tempoDown = document.getElementById('tempo-down');
  var $playPause = document.getElementById('play-pause');
  var $copySection = document.getElementById('copy-section');
  var $pasteSection = document.getElementById('paste-section');
  var $sectionSelect = document.getElementById('section-select');
  var $playSequence = document.getElementById('play-sequence');
  var $customSound1 = document.getElementById('custom-sound-1');
  var $customSound2 = document.getElementById('custom-sound-2');
  var $sectionTabs = document.querySelectorAll('.section-tab');
  var $playbackStatus = document.getElementById('playback-status');
  var $notificationContainer = document.getElementById('notification-container');
  var $midiKeyboard = document.getElementById('midi-keyboard');
  var $octaveDown = document.getElementById('octave-down');
  var $octaveUp = document.getElementById('octave-up');
  var $octaveDisplay = document.getElementById('octave-display');
  var $keyboardHold = document.getElementById('keyboard-hold');
  var $keyboardPreset = document.getElementById('keyboard-preset');
  var $instrumentLabels = document.querySelectorAll('.instrument-label');
  
  // Mobile elements
  var $mobilePlaybackStatus = document.getElementById('mobile-playback-status');
  var $mobileInstrumentDropdown = document.getElementById('mobile-instrument-dropdown');
  var $prevPageBtn = document.querySelector('.prev-page');
  var $nextPageBtn = document.querySelector('.next-page');
  var $currentPage = document.querySelector('.current-page');
  var $totalPages = document.querySelector('.total-pages');
  var $mobileMenuBtn = document.querySelector('.mobile-menu-btn');
  var $mobileMenuOverlay = document.querySelector('.mobile-menu-overlay');
  var $mobileMenuClose = document.querySelector('.mobile-menu-close');
  
  // Audio Effect Controls
  var $delayTime = document.getElementById('delay-time');
  var $delayFeedback = document.getElementById('delay-feedback');
  var $delayActive = document.getElementById('delay-active');
  var $delayTimeValue = document.getElementById('delay-time-value');
  var $delayFeedbackValue = document.getElementById('delay-feedback-value');
  
  var $reverbSize = document.getElementById('reverb-size');
  var $reverbMix = document.getElementById('reverb-mix');
  var $reverbActive = document.getElementById('reverb-active');
  var $reverbSizeValue = document.getElementById('reverb-size-value');
  var $reverbMixValue = document.getElementById('reverb-mix-value');
  
  var $filterCutoff = document.getElementById('filter-cutoff');
  var $filterQ = document.getElementById('filter-q');
  var $filterActive = document.getElementById('filter-active');
  var $filterCutoffValue = document.getElementById('filter-cutoff-value');
  var $filterQValue = document.getElementById('filter-q-value');
  
  var $compThreshold = document.getElementById('comp-threshold');
  var $compRatio = document.getElementById('comp-ratio');
  var $compActive = document.getElementById('comp-active');
  var $compThresholdValue = document.getElementById('comp-threshold-value');
  var $compRatioValue = document.getElementById('comp-ratio-value');
  
  // Mobile menu
  if ($mobileMenuBtn && $mobileMenuOverlay && $mobileMenuClose) {
    $mobileMenuBtn.addEventListener('click', function() {
      $mobileMenuOverlay.style.display = 'flex';
    });
    
    $mobileMenuClose.addEventListener('click', function() {
      $mobileMenuOverlay.style.display = 'none';
    });
  }
  
  // Add glitch effect to element
  function addGlitchEffect(element) {
    if (!element) return;
    element.classList.add('glitch');
    setTimeout(() => {
      element.classList.remove('glitch');
    }, 300);
  }
  
  // Update playback status display
  function updatePlaybackStatus() {
    if (isPlaying) {
      if ($playbackStatus) {
        $playbackStatus.textContent = 'PLAYBACK ACTIVE';
        $playbackStatus.classList.add('playing');
      }
      if ($mobilePlaybackStatus) {
        $mobilePlaybackStatus.textContent = 'PLAYING';
        $mobilePlaybackStatus.style.color = 'var(--primary)';
      }
    } else {
      if ($playbackStatus) {
        $playbackStatus.textContent = 'PLAYBACK PAUSED';
        $playbackStatus.classList.remove('playing');
      }
      if ($mobilePlaybackStatus) {
        $mobilePlaybackStatus.textContent = 'PAUSED';
        $mobilePlaybackStatus.style.color = 'var(--secondary)';
      }
    }
    if ($playbackStatus) addGlitchEffect($playbackStatus);
  }
  
  // Initialize mobile instrument dropdown
  function initializeMobileInstrumentDropdown() {
    if (!$mobileInstrumentDropdown) return;
    
    // Clear any existing options
    $mobileInstrumentDropdown.innerHTML = '';
    
    // Add instrument options
    instrumentNames.forEach((name, index) => {
      const option = document.createElement('option');
      option.value = index;
      option.textContent = name;
      $mobileInstrumentDropdown.appendChild(option);
    });
    
    // Set default value
    $mobileInstrumentDropdown.value = visibleInstrument;
    
    // Add event listener
    $mobileInstrumentDropdown.addEventListener('change', function() {
      visibleInstrument = parseInt(this.value);
      createGrid();
      addGlitchEffect(this);
    });
  }
  
  // Update mobile pagination display
  function updateMobilePagination() {
    if (!$currentPage || !$totalPages) return;
    
    const totalPages = Math.ceil(TICKS / (TICKS / pagesPerRow));
    $currentPage.textContent = currentPage + 1;
    $totalPages.textContent = totalPages;
    
    // Enable/disable navigation buttons
    if ($prevPageBtn) {
      $prevPageBtn.disabled = currentPage === 0;
      $prevPageBtn.style.opacity = currentPage === 0 ? '0.5' : '1';
    }
    
    if ($nextPageBtn) {
      $nextPageBtn.disabled = currentPage >= totalPages - 1;
      $nextPageBtn.style.opacity = currentPage >= totalPages - 1 ? '0.5' : '1';
    }
  }
  
  // Initialize Audio Effects
  function initializeAudioEffects() {
    if (!AudioContext || !context) return;
    
    // Create destination for effects chain
    var masterGain = context.createGain();
    masterGain.gain.value = 1.0;
    masterGain.connect(context.destination);
    
    // Delay
    var delayNode = context.createDelay(5.0);
    delayNode.delayTime.value = 0;
    
    var feedbackGain = context.createGain();
    feedbackGain.gain.value = 0;
    
    delayNode.connect(feedbackGain);
    feedbackGain.connect(delayNode);
    
    audioEffects.delay.node = {
      input: delayNode,
      feedback: feedbackGain,
      output: delayNode
    };
    
    // Reverb (ConvolverNode)
    var convolverNode = context.createConvolver();
    var reverbGainNode = context.createGain();
    reverbGainNode.gain.value = 0;
    
    // Generate reverb impulse response
    generateReverbImpulse(1.0, function(buffer) {
      convolverNode.buffer = buffer;
      audioEffects.reverb.buffer = buffer;
    });
    
    audioEffects.reverb.node = {
      input: convolverNode,
      gain: reverbGainNode,
      output: reverbGainNode
    };
    
    // Filter (BiquadFilterNode)
    var filterNode = context.createBiquadFilter();
    filterNode.type = 'lowpass';
    filterNode.frequency.value = 20000;
    filterNode.Q.value = 0;
    
    audioEffects.filter.node = filterNode;
    
    // Compressor (DynamicsCompressorNode)
    var compressorNode = context.createDynamicsCompressor();
    compressorNode.threshold.value = 0;
    compressorNode.ratio.value = 1;
    compressorNode.attack.value = 0.003;
    compressorNode.release.value = 0.25;
    
    audioEffects.compressor.node = compressorNode;
    
    // Connect effects chain
    // Source -> Filter -> Compressor -> Delay -> Reverb -> Master
    filterNode.connect(compressorNode);
    compressorNode.connect(delayNode);
    delayNode.connect(convolverNode);
    delayNode.connect(masterGain); // Dry signal
    convolverNode.connect(reverbGainNode);
    reverbGainNode.connect(masterGain);
  }
  
  // Generate reverb impulse response
  function generateReverbImpulse(duration, callback) {
    var sampleRate = context.sampleRate;
    var length = sampleRate * duration;
    var impulse = context.createBuffer(2, length, sampleRate);
    var impulseL = impulse.getChannelData(0);
    var impulseR = impulse.getChannelData(1);
    
    for (var i = 0; i < length; i++) {
      var n = i / length;
      // Decay curve (exponential)
      var decay = Math.pow(1 - n, 2);
      // Random noise
      var white = Math.random() * 2 - 1;
      // Apply decay to noise
      impulseL[i] = white * decay;
      impulseR[i] = white * decay;
    }
    
    callback(impulse);
  }
  
  // Create virtual MIDI keyboard
  function createMIDIKeyboard() {
    if (!$midiKeyboard) return;
    
    var keyboardNotes = [
      {note: 'C', octave: 4, type: 'white'},
      {note: 'C#', octave: 4, type: 'black'},
      {note: 'D', octave: 4, type: 'white'},
      {note: 'D#', octave: 4, type: 'black'},
      {note: 'E', octave: 4, type: 'white'},
      {note: 'F', octave: 4, type: 'white'},
      {note: 'F#', octave: 4, type: 'black'},
      {note: 'G', octave: 4, type: 'white'},
      {note: 'G#', octave: 4, type: 'black'},
      {note: 'A', octave: 4, type: 'white'},
      {note: 'A#', octave: 4, type: 'black'},
      {note: 'B', octave: 4, type: 'white'},
      {note: 'C', octave: 5, type: 'white'}
    ];
    
    var keyboardBindings = ['a', 'w', 's', 'e', 'd', 'f', 't', 'g', 'y', 'h', 'u', 'j', 'k'];
    
    $midiKeyboard.innerHTML = '';
    
    keyboardNotes.forEach((noteInfo, index) => {
      var noteKey = document.createElement('div');
      noteKey.className = 'key ' + noteInfo.type;
      noteKey.dataset.note = noteInfo.note;
      noteKey.dataset.octave = noteInfo.octave;
      noteKey.dataset.index = index;
      noteKey.dataset.midiNote = getMIDINoteNumber(noteInfo.note, noteInfo.octave);
      
      var keyLabel = document.createElement('div');
      keyLabel.className = 'key-label';
      keyLabel.textContent = keyboardBindings[index];
      noteKey.appendChild(keyLabel);
      
      // Mouse events
      noteKey.addEventListener('mousedown', function() {
        playMIDINote(parseInt(this.dataset.midiNote));
        this.classList.add('active');
      });
      
      noteKey.addEventListener('mouseup', function() {
        if (!keyboardHold) {
          stopMIDINote(parseInt(this.dataset.midiNote));
          this.classList.remove('active');
        }
      });
      
      noteKey.addEventListener('mouseleave', function() {
        if (!keyboardHold && this.classList.contains('active')) {
          stopMIDINote(parseInt(this.dataset.midiNote));
          this.classList.remove('active');
        }
      });
      
      // Touch events for mobile
      noteKey.addEventListener('touchstart', function(e) {
        e.preventDefault();
        playMIDINote(parseInt(this.dataset.midiNote));
        this.classList.add('active');
      });
      
      noteKey.addEventListener('touchend', function(e) {
        e.preventDefault();
        if (!keyboardHold) {
          stopMIDINote(parseInt(this.dataset.midiNote));
          this.classList.remove('active');
        }
      });
      
      $midiKeyboard.appendChild(noteKey);
    });
    
    // Update key display for current octave
    updateKeyboardOctave();
  }
  
  // Update keyboard octave
  function updateKeyboardOctave() {
    if (!$midiKeyboard) return;
    
    var keys = $midiKeyboard.querySelectorAll('.key');
    keys.forEach(key => {
      var baseOctave = parseInt(key.dataset.octave);
      var newOctave = baseOctave - 4 + currentOctave;
      var noteName = key.dataset.note;
      var newMidiNote = getMIDINoteNumber(noteName, newOctave);
      
      key.dataset.midiNote = newMidiNote;
    });
    
    if ($octaveDisplay) $octaveDisplay.textContent = currentOctave;
  }
  
  // Get MIDI note number from note name and octave
  function getMIDINoteNumber(note, octave) {
    var notes = {'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5, 'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11};
    return notes[note] + (octave * 12) + 12; // +12 for MIDI standard (C-1 = 0)
  }
  
  // Play MIDI note
  function playMIDINote(midiNote) {
    if (!AudioContext || !context) return;
    
    // Stop note if already playing
    if (notesPlaying[midiNote]) {
      stopMIDINote(midiNote);
    }
    
    var frequency = 440 * Math.pow(2, (midiNote - 69) / 12); // A4 (69) = 440Hz
    
    // Create audio graph based on preset
    var oscillator = context.createOscillator();
    var gainNode = context.createGain();
    var filterNode = context.createBiquadFilter();
    
    // Set oscillator type and frequency based on preset
    switch (currentPreset) {
      case 'bass':
        oscillator.type = 'sawtooth';
        filterNode.type = 'lowpass';
        filterNode.frequency.value = 500;
        filterNode.Q.value = 5;
        gainNode.gain.value = 0.7;
        break;
      case 'piano':
        oscillator.type = 'triangle';
        filterNode.type = 'lowpass';
        filterNode.frequency.value = 2000;
        filterNode.Q.value = 1;
        gainNode.gain.value = 0.5;
        break;
      case 'pad':
        oscillator.type = 'sine';
        filterNode.type = 'lowpass';
        filterNode.frequency.value = 1000;
        filterNode.Q.value = 2;
        gainNode.gain.value = 0.4;
        break;
      case 'pluck':
        oscillator.type = 'triangle';
        filterNode.type = 'bandpass';
        filterNode.frequency.value = frequency;
        filterNode.Q.value = 3;
        gainNode.gain.value = 0.5;
        break;
      case 'synth':
      default:
        oscillator.type = 'square';
        filterNode.type = 'lowpass';
        filterNode.frequency.value = 3000;
        filterNode.Q.value = 2;
        gainNode.gain.value = 0.3;
    }
    
    oscillator.frequency.value = frequency;
    
    // Connect nodes
    oscillator.connect(filterNode);
    filterNode.connect(gainNode);
    
    // Connect to effects chain if active
    if (audioEffects.filter.active) {
      gainNode.connect(audioEffects.filter.node);
    } else if (audioEffects.compressor.active) {
      gainNode.connect(audioEffects.compressor.node);
    } else if (audioEffects.delay.active) {
      gainNode.connect(audioEffects.delay.node.input);
    } else if (audioEffects.reverb.active) {
      gainNode.connect(audioEffects.reverb.node.input);
    } else {
      gainNode.connect(context.destination);
    }
    
    // Start oscillator
    oscillator.start();
    
    // Apply ADSR envelope
    var now = context.currentTime;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(gainNode.gain.value, now + 0.01); // Attack
    gainNode.gain.linearRampToValueAtTime(gainNode.gain.value * 0.8, now + 0.1); // Decay
    
    // Store for later reference
    notesPlaying[midiNote] = {
      oscillator: oscillator,
      gain: gainNode
    };
    
    // Add to active keys
    activeKeys.add(midiNote);
  }
  
  // Stop MIDI note
  function stopMIDINote(midiNote) {
    if (!notesPlaying[midiNote]) return;
    
    var now = context.currentTime;
    var noteObj = notesPlaying[midiNote];
    
    // Release envelope
    noteObj.gain.gain.setValueAtTime(noteObj.gain.gain.value, now);
    noteObj.gain.gain.linearRampToValueAtTime(0, now + 0.1);
    
    // Stop oscillator after release
    noteObj.oscillator.stop(now + 0.11);
    
    // Remove from active notes
    delete notesPlaying[midiNote];
    activeKeys.delete(midiNote);
  }
  
  // Function to play sound with effects
  var playSound = function (index) {
    if (!isPlaying) return;
    
    // Check if it's a custom sound
    if (index >= sounds.length - 2) {
      var customIndex = index - (sounds.length - 2);
      var customKey = customIndex === 0 ? 'custom1' : 'custom2';
      
      if (customSounds[customKey]) {
        // Play the custom sound
        if (!AudioContext) {
          var audio = new Audio();
          audio.src = URL.createObjectURL(customSounds[customKey]);
          audio.play();
          return;
        }
        
        // Using the AudioContext API
        var reader = new FileReader();
        reader.onload = function(e) {
          context.decodeAudioData(e.target.result, function(buffer) {
            playBuffer(buffer);
          });
        };
        reader.readAsArrayBuffer(customSounds[customKey]);
        
        return;
      }
      
      // No custom sound loaded, don't play anything
      return;
    }
    
    var url = soundPrefix + sounds[index];

    if (!AudioContext) {
      new Audio(url).play();
      return;
    }
    
    if (typeof(buffers[url]) == 'undefined') {
      buffers[url] = null;
      var req = new XMLHttpRequest();
      req.open('GET', url, true);
      req.responseType = 'arraybuffer';

      req.onload = function () {
        context.decodeAudioData(req.response,
          function (buffer) {
            buffers[url] = buffer;
            playBuffer(buffer);
          },
          function (err) {
            console.log(err);
          }
        );
      };
      req.send();
    }
    
    function playBuffer(buffer) {
      var source = context.createBufferSource();
      source.buffer = buffer;
      
      // Apply effects if active
      if (audioEffects.filter.active) {
        source.connect(audioEffects.filter.node);
      } else if (audioEffects.compressor.active) {
        source.connect(audioEffects.compressor.node);
      } else if (audioEffects.delay.active) {
        source.connect(audioEffects.delay.node.input);
      } else if (audioEffects.reverb.active) {
        source.connect(audioEffects.reverb.node.input);
      } else {
        source.connect(context.destination);
      }
      
      source.start();
    };
    
    if (buffers[url]) {
      playBuffer(buffers[url]);
    }
  };
  
  // Function to create grid based on current section
  var createGrid = function() {
    if (!$grid) return;
    
    $grid.innerHTML = '';
    
    var columnsToShow = isMobile ? TICKS / pagesPerRow : TICKS;
    var startColumn = isMobile ? currentPage * (TICKS / pagesPerRow) : 0;
    var endColumn = isMobile ? startColumn + columnsToShow : TICKS;
    
    // Determine visible rows based on mobile mode
    var startRow = isMobile ? visibleInstrument : 0;
    var endRow = isMobile ? visibleInstrument + 1 : sounds.length;
    
    // Set grid template based on layout
    if (isMobile) {
      $grid.style.gridTemplateColumns = `repeat(${columnsToShow}, 1fr)`;
      $grid.style.gridTemplateRows = `repeat(1, 1fr)`;
    } else {
      $grid.style.gridTemplateColumns = `repeat(${TICKS}, 1fr)`;
      $grid.style.gridTemplateRows = `repeat(${sounds.length}, 30px)`;
    }
    
    // Create buttons for the grid
    var $button = document.createElement('button');
    $button.classList.add('beat');

    for (var r = startRow; r < endRow; r++) {
      for (var c = startColumn; c < endColumn; c++) {
        var _$button = $button.cloneNode(true);
        if (c === 0) {
          _$button.classList.add('first');
        }
        // add a class based on the instrument
        var soundname = sounds[r].split('.')[0];
        _$button.classList.add(soundname);
        _$button.dataset.instrument = soundname;
        _$button.dataset.row = r;
        _$button.dataset.col = c;
        _$button.setAttribute('aria-label', `${instrumentNames[r]} beat ${c+1}`);

        // If this beat is active in the current section
        if (sections[currentSection][r] && sections[currentSection][r][c]) {
          _$button.classList.add('on');
        }

        _$button.addEventListener('click', function() {
          this.classList.toggle('on');
          
          // Update the section data
          var row = parseInt(this.dataset.row);
          var col = parseInt(this.dataset.col);
          
          if (!sections[currentSection][row]) {
            sections[currentSection][row] = {};
          }
          
          sections[currentSection][row][col] = this.classList.contains('on');
          
          // Add glitch effect
          addGlitchEffect(this);
        });
        
        $grid.appendChild(_$button);
      }
    }
    
    // Update mobile pagination if needed
    if (isMobile) {
      updateMobilePagination();
      
      // Update active instrument indicator
      $instrumentLabels.forEach((label, index) => {
        if (index === visibleInstrument) {
          label.classList.add('active');
        } else {
          label.classList.remove('active');
        }
      });
      
      // Update mobile dropdown
      if ($mobileInstrumentDropdown) {
        $mobileInstrumentDropdown.value = visibleInstrument;
      }
    }
    
    // Add glitch effect to grid
    addGlitchEffect($grid);
  };
  
  // Function to switch between sections
  var switchSection = function(sectionName) {
    currentSection = sectionName;
    createGrid();
    
    // Update the tabs
    $sectionTabs.forEach(function(tab) {
      if (tab.dataset.section === sectionName) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });
    
    // Update the dropdown
    if ($sectionSelect) {
      $sectionSelect.value = sectionName;
    }
    
    // Add scanning effect to grid
    var gridContainer = document.querySelector('.grid-container');
    if (gridContainer) {
      gridContainer.classList.add('scanning');
      setTimeout(function() {
        gridContainer.classList.remove('scanning');
      }, 1000);
    }
    
    // Show notification
    showNotification(`SECTION SWITCHED TO: ${sectionName.toUpperCase()}`);
  };
  
  // Function to show notification
  function showNotification(message) {
    // Create notification element
    var notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    
    // Add to container
    if ($notificationContainer) {
      $notificationContainer.appendChild(notification);
      
      // Remove after 3 seconds
      setTimeout(function() {
        notification.style.animation = 'notification-slide-out 0.3s ease forwards';
        setTimeout(function() {
          if (notification.parentNode) {
            $notificationContainer.removeChild(notification);
          }
        }, 300);
      }, 3000);
      
      // Limit to 3 notifications at a time
      var notifications = $notificationContainer.querySelectorAll('.notification');
      if (notifications.length > 3) {
        $notificationContainer.removeChild(notifications[0]);
      }
    }
  }
  
  // Initialize mobile page navigation
  function initializeMobilePageNavigation() {
    if (!$prevPageBtn || !$nextPageBtn) return;
    
    $prevPageBtn.addEventListener('click', function() {
      if (currentPage > 0) {
        currentPage--;
        createGrid();
        addGlitchEffect(this);
      }
    });
    
    $nextPageBtn.addEventListener('click', function() {
      const totalPages = Math.ceil(TICKS / (TICKS / pagesPerRow));
      if (currentPage < totalPages - 1) {
        currentPage++;
        createGrid();
        addGlitchEffect(this);
      }
    });
    
    // Set the total pages
    updateMobilePagination();
  }
  
  // Initialize instrument labels for mobile
  function initializeInstrumentLabels() {
    $instrumentLabels.forEach((label, index) => {
      label.addEventListener('click', function() {
        visibleInstrument = index;
        createGrid();
        addGlitchEffect(this);
      });
    });
  }
  
  // Initialize the sections
  if ($sectionTabs) {
    $sectionTabs.forEach(function(tab) {
      tab.addEventListener('click', function() {
        switchSection(this.dataset.section);
        addGlitchEffect(this);
      });
    });
  }
  
  if ($sectionSelect) {
    $sectionSelect.addEventListener('change', function() {
      switchSection(this.value);
      addGlitchEffect(this);
    });
  }
  
  // Copy and paste section functionality
  if ($copySection) {
    $copySection.addEventListener('click', function() {
      clipboardSection = JSON.parse(JSON.stringify(sections[currentSection]));
      showNotification('SECTION COPIED: ' + currentSection.toUpperCase());
      addGlitchEffect(this);
    });
  }
  
  if ($pasteSection) {
    $pasteSection.addEventListener('click', function() {
      if (!clipboardSection) {
        showNotification('NO SECTION COPIED YET');
        return;
      }
      
      sections[currentSection] = JSON.parse(JSON.stringify(clipboardSection));
      createGrid();
      showNotification('PATTERN PASTED TO: ' + currentSection.toUpperCase());
      addGlitchEffect(this);
    });
  }
  
  // Play sequence functionality
  if ($playSequence) {
    $playSequence.addEventListener('click', function() {
      showNotification('SEQUENCE PLAYBACK COMING SOON');
      addGlitchEffect(this);
      
      // Add scanning effect to timeline
      var timeline = document.querySelector('.timeline-container');
      if (timeline) {
        timeline.classList.add('scanning');
        setTimeout(function() {
          timeline.classList.remove('scanning');
        }, 2000);
      }
    });
  }
  
  // Custom sound upload functionality
  if ($customSound1) {
    $customSound1.addEventListener('change', function(event) {
      var file = event.target.files[0];
      if (file) {
        customSounds.custom1 = file;
        
        // Update the label
        var label = this.parentNode.querySelector('span');
        if (label) {
          label.textContent = file.name.length > 10 ? file.name.substring(0, 8) + '...' : file.name;
        }
        
        showNotification('CUSTOM SOUND 1 LOADED: ' + file.name);
        addGlitchEffect(this.parentNode);
      }
    });
  }
  
  if ($customSound2) {
    $customSound2.addEventListener('change', function(event) {
      var file = event.target.files[0];
      if (file) {
        customSounds.custom2 = file;
        
        // Update the label
        var label = this.parentNode.querySelector('span');
        if (label) {
          label.textContent = file.name.length > 10 ? file.name.substring(0, 8) + '...' : file.name;
        }
        
        showNotification('CUSTOM SOUND 2 LOADED: ' + file.name);
        addGlitchEffect(this.parentNode);
      }
    });
  }
  
  // Clear grid
  var clearBeat = function() {
    var $onbeats = document.querySelectorAll('.beat.on');
    if (!$onbeats.length) return;
    
    for (var i = 0; i < $onbeats.length; i++) {
      $onbeats[i].classList.remove('on');
      
      // Update section data
      var row = parseInt($onbeats[i].dataset.row);
      var col = parseInt($onbeats[i].dataset.col);
      
      if (sections[currentSection][row]) {
        sections[currentSection][row][col] = false;
      }
    }
    
    showNotification('PATTERN CLEARED');
    addGlitchEffect($grid);
  };
  
  document.querySelector('#clear').addEventListener('click', function() {
    clearBeat();
    addGlitchEffect(this);
  });

  // Generate random pattern
  var setRandomBeat = function() {
    clearBeat();
    
    for (var r = 0; r < sounds.length; r++) {
      for (var c = 0; c < TICKS; c++) {
        var num = Math.ceil(Math.random() * 100) % 3;
        if (num === 0) {
          // Update section data
          if (!sections[currentSection][r]) {
            sections[currentSection][r] = {};
          }
          sections[currentSection][r][c] = true;
        }
      }
    }
    
    // Update grid display after setting data
    createGrid();
    
    showNotification('RANDOM PATTERN GENERATED');
    addGlitchEffect($grid);
  };
  
  document.querySelector('#random').addEventListener('click', function() {
    setRandomBeat();
    addGlitchEffect(this);
  });

  // Export pattern as JSON
  var exportBeat = function () {
    // Create an object for all sections
    var exportData = {
      sections: sections,
      bpm: BPM,
      effects: {
        delay: {
          active: audioEffects.delay.active,
          time: audioEffects.delay.time,
          feedback: audioEffects.delay.feedback
        },
        reverb: {
          active: audioEffects.reverb.active,
          size: audioEffects.reverb.size,
          mix: audioEffects.reverb.mix
        },
        filter: {
          active: audioEffects.filter.active,
          cutoff: audioEffects.filter.cutoff,
          q: audioEffects.filter.q
        },
        compressor: {
          active: audioEffects.compressor.active,
          threshold: audioEffects.compressor.threshold,
          ratio: audioEffects.compressor.ratio
        }
      }
    };

    // Create json that can be downloaded
    var data_string = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData));
    var download_link = document.getElementById('download_link');
    if (download_link) {
      download_link.setAttribute("href", data_string);
      download_link.setAttribute("download", "beat_pattern.json");

      // Trigger download
      download_link.click();
    }
    
    showNotification('PATTERN EXPORTED');
  };
  
  document.querySelector('#export').addEventListener('click', function() {
    exportBeat();
    addGlitchEffect(this);
  });

  // Setup tempo control
  if ($tempoSlider) {
    $tempoSlider.addEventListener('input', function() {
      updateTempo(this.value);
    });
  }
  
  if ($tempoUp) {
    $tempoUp.addEventListener('click', function() {
      var newTempo = Math.min(parseInt($tempoValue.textContent) + 5, 200);
      updateTempo(newTempo);
      if ($tempoSlider) $tempoSlider.value = newTempo;
      addGlitchEffect(this);
    });
  }
  
  if ($tempoDown) {
    $tempoDown.addEventListener('click', function() {
      var newTempo = Math.max(parseInt($tempoValue.textContent) - 5, 60);
      updateTempo(newTempo);
      if ($tempoSlider) $tempoSlider.value = newTempo;
      addGlitchEffect(this);
    });
  }
  
  function updateTempo(tempo) {
    BPM = parseInt(tempo);
    if ($tempoValue) $tempoValue.textContent = BPM;
    
    // Update the playback timing
    restartSequencer();
    
    // Add glitch effect
    if ($tempoValue) addGlitchEffect($tempoValue);
  }
  
  // Play/Pause functionality
  if ($playPause) {
    $playPause.addEventListener('click', function() {
      isPlaying = !isPlaying;
      
      if (isPlaying) {
        this.innerHTML = '<span class="pause-icon">❚❚</span>';
        this.setAttribute('aria-label', 'Pause');
        if (AudioContext && context.state === 'suspended') {
          context.resume();
        }
        startSequencer();
        showNotification('PLAYBACK STARTED');
      } else {
        this.innerHTML = '<span class="play-icon">▶</span>';
        this.setAttribute('aria-label', 'Play');
        if (interval) {
          cancelAnimationFrame(interval.value);
        }
        showNotification('PLAYBACK PAUSED');
      }
      
      // Update playback status in header
      updatePlaybackStatus();
      
      addGlitchEffect(this);
    });
  }
  
  // Handle animation frame request for timing
  function requestInterval(fn, delay) {
    var start = new Date().getTime();
    var handle = {};

    function loop() {
      var current = new Date().getTime();
      var delta = current - start;
      if (delta >= delay) {
        fn.call();
        start = new Date().getTime();
      }
      handle.value = requestAnimationFrame(loop);
    }
    handle.value = requestAnimationFrame(loop);
    return handle;
  }
  
  function startSequencer() {
    var tickTime = 60000 / (BPM * 4); // Calculate time per tick based on BPM
    
    interval = requestInterval(function() {
      // Get all current beat buttons
      var $beats = document.querySelectorAll('.beat');
      var visibleBeats = Array.from($beats);
      
      // Clear previous ticked state from all beats in the document
      document.querySelectorAll('.beat.ticked').forEach(function(beat) {
        beat.classList.remove('ticked');
      });
      
      // Calculate which beat should be ticked in the current view
      var tickPosition = currentTick;
      
      // On mobile, adjust for pagination
      if (isMobile) {
        var pageStart = currentPage * (TICKS / pagesPerRow);
        var pageEnd = pageStart + (TICKS / pagesPerRow);
        
        // Only process if the current tick is within the visible range
        if (currentTick >= pageStart && currentTick < pageEnd) {
          tickPosition = currentTick - pageStart;
          
          // Find the beat at this position for the current instrument
          var beatIndex = tickPosition;
          if (beatIndex < visibleBeats.length) {
            var currentBeat = visibleBeats[beatIndex];
            currentBeat.classList.add('ticked');
            
            // Play sound if the beat is on
            if (currentBeat.classList.contains('on')) {
              playSound(visibleInstrument);
            }
          }
        }
      } else {
        // Desktop view - handle all instruments
        for (var i = 0; i < sounds.length; i++) {
          var instrumentBeats = visibleBeats.filter(beat => parseInt(beat.dataset.row) === i);
          
          if (instrumentBeats.length > 0) {
            // Find beats for current instrument at current tick
            var currentBeat = instrumentBeats.find(beat => parseInt(beat.dataset.col) === currentTick);
            
            if (currentBeat) {
              currentBeat.classList.add('ticked');
              
              if (currentBeat.classList.contains('on')) {
                playSound(i);
              }
            }
          }
        }
      }
      
      // Advance tick counter
      lastTick = currentTick;
      currentTick = (currentTick + 1) % TICKS;
    }, tickTime);
  }
  
  function restartSequencer() {
    if (interval) {
      cancelAnimationFrame(interval.value);
    }
    if (isPlaying) {
      startSequencer();
    }
  }
  
  // Setup Audio Effect Controls
  function setupEffectControls() {
    // Delay
    if ($delayTime) {
      $delayTime.addEventListener('input', function() {
        var value = parseInt(this.value);
        var delayTime = value / 1000; // Convert to seconds (0-100ms)
        
        if (audioEffects.delay.node) {
          audioEffects.delay.node.input.delayTime.value = delayTime;
        }
        
        audioEffects.delay.time = value;
        if ($delayTimeValue) $delayTimeValue.textContent = value + ' ms';
      });
    }
    
    if ($delayFeedback) {
      $delayFeedback.addEventListener('input', function() {
        var value = parseInt(this.value) / 100; // 0-1
        
        if (audioEffects.delay.node) {
          audioEffects.delay.node.feedback.gain.value = value;
        }
        
        audioEffects.delay.feedback = parseInt(this.value);
        if ($delayFeedbackValue) $delayFeedbackValue.textContent = this.value + '%';
      });
    }
    
    if ($delayActive) {
      $delayActive.addEventListener('change', function() {
        audioEffects.delay.active = this.checked;
        
        if (this.checked) {
          showNotification('DELAY EFFECT ACTIVATED');
        } else {
          showNotification('DELAY EFFECT DEACTIVATED');
        }
        
        // Add glitch effect
        addGlitchEffect(this.parentNode);
      });
    }
    
    // Reverb
    if ($reverbSize) {
      $reverbSize.addEventListener('input', function() {
        var value = parseInt(this.value) / 100; // 0-1
        
        if (audioEffects.reverb.node) {
          // Generate new impulse response for the size
          generateReverbImpulse(value * 3, function(buffer) {
            audioEffects.reverb.node.input.buffer = buffer;
          });
        }
        
        audioEffects.reverb.size = parseInt(this.value);
        if ($reverbSizeValue) $reverbSizeValue.textContent = this.value + '%';
      });
    }
    
    if ($reverbMix) {
      $reverbMix.addEventListener('input', function() {
        var value = parseInt(this.value) / 100; // 0-1
        
        if (audioEffects.reverb.node) {
          audioEffects.reverb.node.gain.gain.value = value;
        }
        
        audioEffects.reverb.mix = parseInt(this.value);
        if ($reverbMixValue) $reverbMixValue.textContent = this.value + '%';
      });
    }
    
    if ($reverbActive) {
      $reverbActive.addEventListener('change', function() {
        audioEffects.reverb.active = this.checked;
        
        if (this.checked) {
          showNotification('REVERB EFFECT ACTIVATED');
        } else {
          showNotification('REVERB EFFECT DEACTIVATED');
        }
        
        // Add glitch effect
        addGlitchEffect(this.parentNode);
      });
    }
    
    // Filter
    if ($filterCutoff) {
      $filterCutoff.addEventListener('input', function() {
        var value = parseInt(this.value);
        
        if (audioEffects.filter.node) {
          audioEffects.filter.node.frequency.value = value;
        }
        
        audioEffects.filter.cutoff = value;
        if ($filterCutoffValue) $filterCutoffValue.textContent = value + ' Hz';
      });
    }
    
    if ($filterQ) {
      $filterQ.addEventListener('input', function() {
        var value = parseInt(this.value) / 10; // 0-10
        
        if (audioEffects.filter.node) {
          audioEffects.filter.node.Q.value = value;
        }
        
        audioEffects.filter.q = parseInt(this.value);
        if ($filterQValue) $filterQValue.textContent = value.toFixed(1);
      });
    }
    
    if ($filterActive) {
      $filterActive.addEventListener('change', function() {
        audioEffects.filter.active = this.checked;
        
        if (this.checked) {
          showNotification('FILTER EFFECT ACTIVATED');
        } else {
          showNotification('FILTER EFFECT DEACTIVATED');
        }
        
        // Add glitch effect
        addGlitchEffect(this.parentNode);
      });
    }
    
    // Compressor
    if ($compThreshold) {
      $compThreshold.addEventListener('input', function() {
        var value = parseInt(this.value);
        
        if (audioEffects.compressor.node) {
          audioEffects.compressor.node.threshold.value = value;
        }
        
        audioEffects.compressor.threshold = value;
        if ($compThresholdValue) $compThresholdValue.textContent = value + ' dB';
      });
    }
    
    if ($compRatio) {
      $compRatio.addEventListener('input', function() {
        var value = parseInt(this.value);
        
        if (audioEffects.compressor.node) {
          audioEffects.compressor.node.ratio.value = value;
        }
        
        audioEffects.compressor.ratio = value;
        if ($compRatioValue) $compRatioValue.textContent = value + ':1';
      });
    }
    
    if ($compActive) {
      $compActive.addEventListener('change', function() {
        audioEffects.compressor.active = this.checked;
        
        if (this.checked) {
          showNotification('COMPRESSOR EFFECT ACTIVATED');
        } else {
          showNotification('COMPRESSOR EFFECT DEACTIVATED');
        }
        
        // Add glitch effect
        addGlitchEffect(this.parentNode);
      });
    }
  }
  
  // Setup MIDI Keyboard Controls
  function setupMIDIKeyboardControls() {
    // Octave controls
    if ($octaveDown) {
      $octaveDown.addEventListener('click', function() {
        if (currentOctave > 1) {
          currentOctave--;
          updateKeyboardOctave();
          showNotification('OCTAVE: ' + currentOctave);
          addGlitchEffect(this);
        }
      });
    }
    
    if ($octaveUp) {
      $octaveUp.addEventListener('click', function() {
        if (currentOctave < 7) {
          currentOctave++;
          updateKeyboardOctave();
          showNotification('OCTAVE: ' + currentOctave);
          addGlitchEffect(this);
        }
      });
    }
    
    // Hold mode
    if ($keyboardHold) {
      $keyboardHold.addEventListener('change', function() {
        keyboardHold = this.checked;
        
        if (this.checked) {
          showNotification('KEYBOARD HOLD: ON');
        } else {
          // Release all held notes
          activeKeys.forEach(midiNote => {
            stopMIDINote(midiNote);
            var keyElement = document.querySelector(`.key[data-midi-note="${midiNote}"]`);
            if (keyElement) {
              keyElement.classList.remove('active');
            }
          });
          showNotification('KEYBOARD HOLD: OFF');
        }
      });
    }
    
    // Preset selection
    if ($keyboardPreset) {
      $keyboardPreset.addEventListener('change', function() {
        currentPreset = this.value;
        showNotification('SOUND PRESET: ' + currentPreset.toUpperCase());
        addGlitchEffect(this);
      });
    }
    
    // Computer keyboard control
    document.addEventListener('keydown', function(e) {
      if (e.repeat) return; // Prevent key repeat
      
      // Handle octave changes
      if (e.key === 'z' || e.key === 'Z') {
        if ($octaveDown) $octaveDown.click();
        return;
      }
      if (e.key === 'x' || e.key === 'X') {
        if ($octaveUp) $octaveUp.click();
        return;
      }
      
      // Handle note keys
      var key = e.key.toLowerCase();
      if (keyMapping[key]) {
        var midiNote = keyMapping[key] - 60 + (currentOctave - 4) * 12 + 60;
        if (!activeKeys.has(midiNote)) {
          playMIDINote(midiNote);
          
          // Highlight the key
          var keyElement = document.querySelector(`.key[data-midi-note="${midiNote}"]`);
          if (keyElement) {
            keyElement.classList.add('active');
          }
        }
      }
    });
    
    document.addEventListener('keyup', function(e) {
      // Handle note keys
      var key = e.key.toLowerCase();
      if (keyMapping[key] && !keyboardHold) {
        var midiNote = keyMapping[key] - 60 + (currentOctave - 4) * 12 + 60;
        stopMIDINote(midiNote);
        
        // Remove highlight
        var keyElement = document.querySelector(`.key[data-midi-note="${midiNote}"]`);
        if (keyElement) {
          keyElement.classList.remove('active');
        }
      }
    });
  }
  
  // Add occasional glitch effects to UI
  setInterval(function() {
    // Randomly select elements to glitch
    if (Math.random() < 0.1) {
      const elements = [
        document.querySelector('.status-indicator'),
        document.querySelector('.interface-title h1'),
        document.querySelector('.panel-blinker')
      ];
      
      const element = elements[Math.floor(Math.random() * elements.length)];
      if (element) {
        addGlitchEffect(element);
      }
    }
  }, 5000);
  
  // Keyboard shortcuts
  document.addEventListener('keydown', function(e) {
    if (e.target.tagName.toLowerCase() === 'input' || 
        e.target.tagName.toLowerCase() === 'select' ||
        e.target.tagName.toLowerCase() === 'textarea') return;
    
    switch (e.key) {
      case ' ': // Spacebar - play/pause
        if ($playPause) $playPause.click();
        e.preventDefault();
        break;
      case 'c': // c - clear
        if (e.ctrlKey || e.metaKey) return; // Don't interfere with browser shortcuts
        document.querySelector('#clear').click();
        break;
      case 'r': // r - random
        document.querySelector('#random').click();
        break;
      case 'e': // e - export
        document.querySelector('#export').click();
        break;
      case 'ArrowUp': // Up arrow - tempo up
        if ($tempoUp) $tempoUp.click();
        break;
      case 'ArrowDown': // Down arrow - tempo down
        if ($tempoDown) $tempoDown.click();
        break;
    }
  });
  
  // Handle mobile orientation change
  window.addEventListener('orientationchange', function() {
    // Adjust UI for new orientation
    setTimeout(function() {
      var isLandscape = window.matchMedia("(orientation: landscape)").matches;
      
      // In landscape, make grid more visible
      if (isLandscape) {
        document.querySelectorAll('.section-tab').forEach(function(tab) {
          tab.style.padding = '8px 15px';
        });
      } else {
        document.querySelectorAll('.section-tab').forEach(function(tab) {
          tab.style.padding = '10px 18px';
        });
      }
      
      // Recreate grid for the new orientation
      createGrid();
      
      // Show notification
      showNotification('DISPLAY ORIENTATION ADJUSTED');
    }, 300);
  });
  
  // Window resize handling
  window.addEventListener('resize', function() {
    // Update mobile detection
    var wasMobile = isMobile;
    isMobile = window.innerWidth <= 768;
    
    // If mobile state changed, recreate the grid
    if (wasMobile !== isMobile) {
      createGrid();
    }
  });
  
  // Initialize all components
  function initialize() {
    // Set initial mobile detection
    isMobile = window.innerWidth <= 768;
    
    // Initialize the grid
    createGrid();
    
    // Set up play/pause button initial state
    if ($playPause) {
      $playPause.innerHTML = '<span class="play-icon">▶</span>';
      $playPause.setAttribute('aria-label', 'Play');
    }
    
    // Initialize mobile components if needed
    if (isMobile) {
      initializeMobileInstrumentDropdown();
      initializeMobilePageNavigation();
    }
    
    // Initialize instrument labels
    initializeInstrumentLabels();
    
    // Add scanning effect to grid initially
    var gridContainer = document.querySelector('.grid-container');
    if (gridContainer) {
      gridContainer.classList.add('scanning');
    }
    
    // Set initial playback status
    updatePlaybackStatus();
    
    // Initialize effect values
    if ($delayTimeValue) $delayTimeValue.textContent = '0 ms';
    if ($delayFeedbackValue) $delayFeedbackValue.textContent = '0%';
    if ($reverbSizeValue) $reverbSizeValue.textContent = '0%';
    if ($reverbMixValue) $reverbMixValue.textContent = '0%';
    if ($filterCutoffValue) $filterCutoffValue.textContent = '20000 Hz';
    if ($filterQValue) $filterQValue.textContent = '0';
    if ($compThresholdValue) $compThresholdValue.textContent = '0 dB';
    if ($compRatioValue) $compRatioValue.textContent = '1:1';
    
    // Initialize audio effects
    if (AudioContext && context) {
      initializeAudioEffects();
      setupEffectControls();
    }
    
    // Create MIDI keyboard
    createMIDIKeyboard();
    setupMIDIKeyboardControls();
    
    // Initialize timeline sections to be clickable
    document.querySelectorAll('.timeline-section').forEach(function(section) {
      section.addEventListener('click', function() {
        const sectionType = this.classList[1]; // intro, verse, chorus, outro
        if (sectionType) {
          // Find the corresponding tab and click it
          document.querySelectorAll('.section-tab').forEach(function(tab) {
            if (tab.dataset.section === sectionType) {
              tab.click();
            }
          });
        }
      });
    });
    
    if (gridContainer) {
      setTimeout(function() {
        gridContainer.classList.remove('scanning');
        
        // Show initial notification
        showNotification('BEAT MACHINE READY');
      }, 1000);
    }
  }
  
  // Initialize the application
  initialize();
}());