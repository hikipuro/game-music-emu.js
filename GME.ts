const Module = require("./gme.js");

let _isInitialized: boolean = false;

export class GME {
	/** default sample rate. */
	public static readonly DefaultSampleRate: number = 44100;
	/** audio buffer size in bytes. */
	public static AudioBufferSize: number = 4096 / 4;

	protected _type: number = 0;
	protected _musicEmu: number = 0;
	protected _audioBuffer: number = 0;
	protected _context: AudioContext = null;
	protected _processor: ScriptProcessorNode = null;

	public static get isInitialized(): boolean {
		return _isInitialized;
	}

	/**
	 * Get corresponding music type for file path or extension passed in.
	 * @param pathOrExtension 
	 */
	public static identifyExtension(pathOrExtension: string): number {
		return GME.API.gme_identify_extension(pathOrExtension);
	}

	/** Type of this emulator */
	public get type(): number {
		return this._type;
	}

	/** Name of game system for this music file type */
	public get system(): string {
		return GME.API.gme_type_system(this._type);
	}

	/** True if this music file type supports multiple tracks */
	public get isMultitrack(): boolean {
		return GME.API.gme_type_multitrack(this._type) !== 0;
	}

	/** Number of tracks available */
	public get trackCount(): number {
		return GME.API.gme_track_count(this._musicEmu);
	}

	/** True if a track has reached its end */
	public get trackEnded(): boolean {
		return GME.API.gme_track_ended(this._musicEmu) === 1;
	}
	
	/** Number of milliseconds (1000 = one second) played since beginning of track */
	public get tell(): number {
		return GME.API.gme_tell(this._musicEmu);
	}
	
	/** Number of samples generated since beginning of track. */
	public get tellSamples(): number {
		return GME.API.gme_tell_samples(this._musicEmu);
	}

	/**
	 * Most recent warning string, or NULL if none.
	 * Clears current warning after returning.
	 * Warning is also cleared when loading a file and starting a track. 
	 */
	public get warning(): string {
		return GME.API.gme_warning(this._musicEmu);
	}
	
	/** Number of voices used by currently loaded file. */
	public get voiceCount(): number {
		return GME.API.gme_voice_count(this._musicEmu);
	}

	/**
	 * Create new game-music-emu object.
	 * @param type Select from GME.Type member.
	 * @param sampleRate Audio sample rate (default: 44100).
	 */
	constructor(type: number, sampleRate: number = GME.DefaultSampleRate) {
		this._type = type;
		this._musicEmu = GME.API.gme_new_emu(type, sampleRate);
		this._audioBuffer = Module._malloc(GME.AudioBufferSize * 4);

		this._context = new AudioContext();
		this._processor = this._context.createScriptProcessor(
			GME.AudioBufferSize, 0, 2
		);
	}

	/**
	 * Finish using emulator and free memory.
	 */
	public delete(): void {
		GME.API.gme_delete(this._musicEmu);
		Module._free(this._audioBuffer);
	}

	/*
	public loadFile(path: string): void {
		if (path == null || path.length <= 0) {
			return;
		}
		const result = GmeMethods.gme_load_file(this._MusicEmu, path);
		this.checkError("GmePlayer.loadFile", result);
	}
	*/

	/**
	 * Load music file from memory into emulator.
	 * @param data 
	 */
	public loadData(data: Buffer): void {
		if (data == null || data.length <= 0) {
			return;
		}
		const result = GME.API.gme_load_data(this._musicEmu, data, data.length);
		this.checkError("loadData", result);
	}

	/**
	 * Stop music.
	 */
	public stop(): void {
		const processor = this._processor;
		processor.removeEventListener("audioprocess", this.onAudioProcess);
		processor.disconnect(this._context.destination);
	}

	/**
	 * Play music by Web Audio API.
	 * @param track track number (0 is first track).
	 */
	public play(track: number = 0): void {
		const result = GME.API.gme_start_track(this._musicEmu, track);
		if (this.checkError("play", result)) {
			return;
		}
		
		const processor = this._processor;
		processor.addEventListener("audioprocess", this.onAudioProcess);
		processor.connect(this._context.destination);
	}

	/**
	 * Set time to start fading track out.
	 * Once fade ends trackEnded returns true.
	 * Fade time can be changed while track is playing. 
	 * @param startMsec 
	 */
	public setFade(startMsec: number): void {
		GME.API.gme_set_fade(this._musicEmu, startMsec);
	}

	/**
	 * Seek to new time in track.
	 * Seeking backwards or far forward can take a while.
	 * @param msec 
	 */
	public seek(msec: number): void {
		const result = GME.API.gme_seek(this._musicEmu, msec);
		this.checkError("seek", result);
	}

	/**
	 * Equivalent to restarting track then skipping n samples.
	 * @param n 
	 */
	public seekSamples(n: number): void {
		const result = GME.API.gme_seek_samples(this._musicEmu, n);
		this.checkError("seekSamples", result);
	}

	/**
	 * Gets information for a particular track (length, name, author, etc.).
	 * @param track 
	 */
	public trackInfo(track: number): GME.TrackInfo {
		const trackInfo = new GME.TrackInfo();
		const pointer = Module._malloc(4);
		const result = GME.API.gme_track_info(this._musicEmu, pointer, track);
		if (this.checkError("trackInfo", result)) {
			return null;
		}
		const info = Module.getValue(pointer, "*");

		trackInfo.length = Module.getValue(info + 4 * 0, "*");
		trackInfo.introLength = Module.getValue(info + 4 * 1, "*");
		trackInfo.loopLength = Module.getValue(info + 4 * 2, "*");
		trackInfo.playLength = Module.getValue(info + 4 * 3, "*");
		trackInfo.system = Module.UTF8ToString(
			Module.getValue(info + 4 * 16, "*")
		);
		trackInfo.game = Module.UTF8ToString(
			Module.getValue(info + 4 * 17, "*")
		);
		trackInfo.song = Module.UTF8ToString(
			Module.getValue(info + 4 * 18, "*")
		);
		trackInfo.author = Module.UTF8ToString(
			Module.getValue(info + 4 * 19, "*")
		);
		trackInfo.copyright = Module.UTF8ToString(
			Module.getValue(info + 4 * 20, "*")
		);
		trackInfo.comment = Module.UTF8ToString(
			Module.getValue(info + 4 * 21, "*")
		);
		trackInfo.dumper = Module.UTF8ToString(
			Module.getValue(info + 4 * 22, "*")
		);

		GME.API.gme_free_info(info);
		Module._free(pointer);
		return trackInfo;
	}

	/**
	 * Adjust stereo echo depth, where 0.0 = off and 1.0 = maximum.
	 * Has no effect for GYM, SPC, and Sega Genesis VGM music.
	 * @param depth 
	 */
	public setStereoDepth(depth: number): void {
		GME.API.gme_set_stereo_depth(this._musicEmu, depth);
	}
	
	/**
	 * Disable automatic end-of-track detection and skipping
	 * of silence at beginning if ignore is true.
	 * @param ignore 
	 */
	public ignoreSilence(ignore: number): void {
		GME.API.gme_ignore_silence(this._musicEmu, ignore);
	}
	
	/**
	 * Adjust song tempo, where 1.0 = normal, 0.5 = half speed, 2.0 = double speed.
	 * Track length as returned by track_info() assumes a tempo of 1.0.
	 * @param tempo 
	 */
	public setTempo(tempo: number): void {
		GME.API.gme_set_tempo(this._musicEmu, tempo);
	}
	
	/**
	 * Name of voice i, from 0 to voiceCount - 1.
	 * @param i 
	 */
	public voiceName(i: number): string {
		return GME.API.gme_voice_name(this._musicEmu, i);
	}
	
	/**
	 * Mute/unmute voice i, where voice 0 is first voice.
	 * @param index 
	 * @param mute 
	 */
	public muteVoice(index: number, mute: boolean): void {
		const muteValue = mute ? 1 : 0;
		GME.API.gme_mute_voice(this._musicEmu, index, muteValue);
	}
	
	/**
	 * Set muting state of all voices at once using a bit mask,
	 * where -1 mutes all voices, 0 unmutes them all,
	 * 0x01 mutes just the first voice, etc.
	 * @param mutingMask 
	 */
	public muteVoices(mutingMask: number): void {
		GME.API.gme_mute_voices(this._musicEmu, mutingMask);
	}

	/**
	 * API error check.
	 * @param methodName caller method name.
	 * @param result API result value (gme_err_t).
	 */
	protected checkError(methodName: string, result: number): boolean {
		if (result === 0) {
			return false;
		}
		console.error(
			this.constructor.name + "." + methodName + " [" + result + "]",
			Module.UTF8ToString(result)
		);
		return true;
	}

	/**
	 * Web Audio API audio processing event.
	 */
	protected onAudioProcess = (event: AudioProcessingEvent): void => {
		const bufferSize = GME.AudioBufferSize;
		const L = event.outputBuffer.getChannelData(0);
		const R = event.outputBuffer.getChannelData(1);

		const result = GME.API.gme_play(
			this._musicEmu, bufferSize * 2, this._audioBuffer
		);
		if (result !== 0) {
			for (let i = 0; i < bufferSize; i++) {
				L[i] = 0;
				R[i] = 0;
			}
			return;
		}
		
		for (let i = 0; i < bufferSize; i++) {
			const pointer = this._audioBuffer + i * 4;
			const shortDataL = Module.getValue(pointer, "i16");
			const shortDataR = Module.getValue(pointer + 2, "i16");
			L[i] = shortDataL / 32768;
			R[i] = shortDataR / 32768;
		}
	}
}

export module GME {
	type int = number;
	type long = number;
	type gme_err_t = number;
	type gme_type_t = number;
	type gme_equalizer_t = number;
	type Pointer = number;
	type Music_Emu = number;

	export class API {
		// Basic operations
		public static gme_open_file: (path: string, Music_Emu: Music_Emu, sample_rate: int) => gme_err_t;
		public static gme_track_count: (Music_Emu: Music_Emu) => int;
		public static gme_start_track: (Music_Emu: Music_Emu, index: int) => gme_err_t;
		public static gme_play: (Music_Emu: Music_Emu, count: int, out: Pointer) => gme_err_t;
		public static gme_delete: (Music_Emu: Music_Emu) => void;
	
		// Track position/length
		public static gme_set_fade: (Music_Emu: Music_Emu, start_msec: number) => void;
		public static gme_track_ended: (Music_Emu: Music_Emu) => int;
		public static gme_tell: (Music_Emu: Music_Emu) => int;
		public static gme_tell_samples: (Music_Emu: Music_Emu) => int;
		public static gme_seek: (Music_Emu: Music_Emu, msec: int) => gme_err_t;
		public static gme_seek_samples: (Music_Emu: Music_Emu, n: int) => gme_err_t;
	
		// Informational
		public static gme_warning: (Music_Emu: Music_Emu) => string;
		public static gme_load_m3u: (Music_Emu: Music_Emu, path: string) => number;
		public static gme_clear_playlist: (Music_Emu: Music_Emu) => void;
		public static gme_track_info: (Music_Emu: Music_Emu, out: number, track: number) => number;
		public static gme_free_info: (info: number) => void;
	
		// Advanced playback
		public static gme_set_stereo_depth: (Music_Emu: Music_Emu, depth: number) => void;
		public static gme_ignore_silence: (Music_Emu: Music_Emu, ignore: int) => void;
		public static gme_set_tempo: (Music_Emu: Music_Emu, tempo: number) => void;
		public static gme_voice_count: (Music_Emu: Music_Emu) => int;
		public static gme_voice_name: (Music_Emu: Music_Emu, i: int) => string;
		public static gme_mute_voice: (Music_Emu: Music_Emu, index: int, mute: int) => void;
		public static gme_mute_voices: (Music_Emu: Music_Emu, muting_mask: int) => void;
		public static gme_equalizer: (Music_Emu: Music_Emu, out: gme_equalizer_t) => void;
		public static gme_set_equalizer: (Music_Emu: Music_Emu, eq: gme_equalizer_t) => void;
		public static gme_enable_accuracy: (Music_Emu: Music_Emu, enabled: int) => void;
	
		// Game music types
		public static gme_type: (Music_Emu: Music_Emu) => gme_type_t;
		public static gme_type_list: () => gme_type_t;
		public static gme_type_system: (gme_type_t: gme_type_t) => string;
		public static gme_type_multitrack: (gme_type_t: gme_type_t) => int;
	
		// Advanced file loading
		public static gme_open_data: (data: number, size: number, Music_Emu: number, sample_rate: number) => gme_err_t;
		public static gme_identify_header: (header: Pointer) => Pointer;
		public static gme_identify_extension: (path_or_extension: string) => gme_type_t;
		public static gme_identify_file: (path: string, type_out: gme_type_t) => gme_err_t;
		public static gme_new_emu: (gme_type_t: gme_type_t, sample_rate: int) => Music_Emu;
		public static gme_load_file: (Music_Emu: Music_Emu, path: string) => gme_err_t;
		public static gme_load_data: (Music_Emu: Music_Emu, data: any, size: long) => gme_err_t;
		public static gme_load_custom: (Music_Emu: Music_Emu) => gme_err_t;
		public static gme_load_m3u_data: (Music_Emu: Music_Emu, data: any, size: long) => gme_err_t;
	
		// User data
		public static gme_set_user_data: (Music_Emu: Music_Emu, new_user_data: Pointer) => void;
		public static gme_user_data: (Music_Emu: Music_Emu) => Pointer;
		public static gme_set_user_cleanup: (Music_Emu: Music_Emu, func: Pointer) => void;
		
		public static init() {
			if (_isInitialized) {
				return;
			}
			
			// Basic operations
			this.gme_open_file = Module.cwrap(
				"gme_open_file", "number", ["number", "number"]);
			this.gme_track_count = Module.cwrap(
				"gme_track_count", "number", ["number"]);
			this.gme_start_track = Module.cwrap(
				"gme_start_track", "number", ["number", "number"]);
			this.gme_play = Module.cwrap(
				"gme_play", "number", ["number", "number", "number"]);
			this.gme_delete = Module.cwrap(
				"gme_delete", "void", ["number"]);
	
			// Track position/length
			this.gme_set_fade = Module.cwrap(
				"gme_set_fade", "void", ["number", "number"]);
			this.gme_track_ended = Module.cwrap(
				"gme_track_ended", "number", ["number"]);
			this.gme_tell = Module.cwrap(
				"gme_tell", "number", ["number"]);
			this.gme_tell_samples = Module.cwrap(
				"gme_tell_samples", "number", ["number"]);
			this.gme_seek = Module.cwrap(
				"gme_seek", "number", ["number", "number"]);
			this.gme_seek_samples = Module.cwrap(
				"gme_seek_samples", "number", ["number", "number"]);
	
			// Informational
			this.gme_warning = Module.cwrap(
				"gme_warning", "string", ["number"]);
			this.gme_load_m3u = Module.cwrap(
				"gme_load_m3u", "number", ["number", "number"]);
			this.gme_clear_playlist = Module.cwrap(
				"gme_clear_playlist", "void", ["number"]);
			this.gme_track_info = Module.cwrap(
				"gme_track_info", "number", ["number", "number", "number"]);
			this.gme_free_info = Module.cwrap(
				"gme_free_info", "void", ["number"]);
	
			// Advanced playback
			this.gme_set_stereo_depth = Module.cwrap(
				"gme_set_stereo_depth", "void", ["number", "number"]);
			this.gme_ignore_silence = Module.cwrap(
				"gme_ignore_silence", "void", ["number", "number"]);
			this.gme_set_tempo = Module.cwrap(
				"gme_set_tempo", "void", ["number", "number"]);
			this.gme_voice_count = Module.cwrap(
				"gme_voice_count", "number", ["number"]);
			this.gme_voice_name = Module.cwrap(
				"gme_voice_name", "string", ["number", "number"]);
			this.gme_mute_voice = Module.cwrap(
				"gme_mute_voice", "void", ["number", "number", "number"]);
			this.gme_mute_voices = Module.cwrap(
				"gme_mute_voices", "void", ["number", "number"]);
			this.gme_equalizer = Module.cwrap(
				"gme_equalizer", "void", ["number", "number"]);
			this.gme_set_equalizer = Module.cwrap(
				"gme_set_equalizer", "void", ["number", "number"]);
			this.gme_enable_accuracy = Module.cwrap(
				"gme_enable_accuracy", "void", ["number", "number"]);
	
			// Game music types
			this.gme_type = Module.cwrap(
				"gme_type", "number", ["number", "number"]);
			this.gme_type_list = Module.cwrap(
				"gme_type_list", "number", []);
			this.gme_type_system = Module.cwrap(
				"gme_type_system", "string", ["number"]);
			this.gme_type_multitrack = Module.cwrap(
				"gme_type_multitrack", "number", ["number"]);
	
			// Advanced file loading
			this.gme_open_data = Module.cwrap(
				"gme_open_data", "number", ["number", "number", "number", "number"]);
			this.gme_identify_header = Module.cwrap(
				"gme_identify_header", "number", ["number"]);
			this.gme_identify_extension = Module.cwrap(
				"gme_identify_extension", "number", ["string"]);
			this.gme_identify_file = Module.cwrap(
				"gme_identify_file", "number", ["number"]);
			this.gme_new_emu = Module.cwrap(
				"gme_new_emu", "number", ["number", "number"]);
			this.gme_load_file = Module.cwrap(
				"gme_load_file", "number", ["number", "string"]);
			this.gme_load_data = Module.cwrap(
				"gme_load_data", "number", ["number", "array", "number"]);
			this.gme_load_custom = Module.cwrap(
				"gme_load_custom", "number", ["number", "array", "number"]);
			this.gme_load_m3u_data = Module.cwrap(
				"gme_load_m3u_data", "number", ["number", "array", "number"]);
			
			// User data
			this.gme_set_user_data = Module.cwrap(
				"gme_set_user_data", "number", ["number", "array", "number"]);
			this.gme_user_data = Module.cwrap(
				"gme_user_data", "number", ["number", "array", "number"]);
			this.gme_set_user_cleanup = Module.cwrap(
				"gme_set_user_cleanup", "number", ["number", "array", "number"]);
		}
	}
	
	export class Type {
		protected static _initialized: boolean = false;
	
		protected static _AY: number = 0;
		protected static _GBS: number = 0;
		protected static _GYM: number = 0;
		protected static _HES: number = 0;
		protected static _KSS: number = 0;
		protected static _NSF: number = 0;
		protected static _NSFE: number = 0;
		protected static _SAP: number = 0;
		protected static _SPC: number = 0;
		protected static _VGM: number = 0;
		protected static _VGZ: number = 0;
		
		public static get AY(): number { return this._AY; }
		public static get GBS(): number { return this._GBS; }
		public static get GYM(): number { return this._GYM; }
		public static get HES(): number { return this._HES; }
		public static get KSS(): number { return this._KSS; }
		public static get NSF(): number { return this._NSF; }
		public static get NSFE(): number { return this._NSFE; }
		public static get SAP(): number { return this._SAP; }
		public static get SPC(): number { return this._SPC; }
		public static get VGM(): number { return this._VGM; }
		public static get VGZ(): number { return this._VGZ; }
	
		public static init(): void {
			if (_isInitialized) {
				return;
			}
	
			this._AY = Module.ccall("gme_get_ay_type", "number", null, null);
			this._GBS = Module.ccall("gme_get_gbs_type", "number", null, null);
			this._GYM = Module.ccall("gme_get_gym_type", "number", null, null);
			this._HES = Module.ccall("gme_get_hes_type", "number", null, null);
			this._KSS = Module.ccall("gme_get_kss_type", "number", null, null);
			this._NSF = Module.ccall("gme_get_nsf_type", "number", null, null);
			this._NSFE = Module.ccall("gme_get_nsfe_type", "number", null, null);
			this._SAP = Module.ccall("gme_get_sap_type", "number", null, null);
			this._SPC = Module.ccall("gme_get_spc_type", "number", null, null);
			this._VGM = Module.ccall("gme_get_vgm_type", "number", null, null);
			this._VGZ = Module.ccall("gme_get_vgz_type", "number", null, null);
		}
	}

	export class TrackInfo {
		/**
		 * total length, if file specifies it.
		 * times in milliseconds; -1 if unknown.
		 */
		public length: number;
		/**
		 * length of song up to looping section.
		 * times in milliseconds; -1 if unknown.
		 */
		public introLength: number;
		/**
		 * length of looping section.
		 * times in milliseconds; -1 if unknown.
		 */
		public loopLength: number;

		/**
		 * Length if available, otherwise introLength + loopLength * 2
		 * if available, otherwise a default of 150000 (2.5 minutes).
		 */
		public playLength: number;
		
		/** empty string ("") if not available. */
		public system: string;
		/** empty string ("") if not available. */
		public game: string;
		/** empty string ("") if not available. */
		public song: string;
		/** empty string ("") if not available. */
		public author: string;
		/** empty string ("") if not available. */
		public copyright: string;
		/** empty string ("") if not available. */
		public comment: string;
		/** empty string ("") if not available. */
		public dumper: string;
	}
}

Module["onRuntimeInitialized"] = () => {
	//console.log("*** onRuntimeInitialized");
	GME.API.init();
	GME.Type.init();
	_isInitialized = true;
};
