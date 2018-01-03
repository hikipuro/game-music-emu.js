#ifndef JS_GLUE_H
#define JS_GLUE_H

#include <emscripten.h>
#include "gme.h"

#ifdef __cplusplus
	extern "C" {
#endif

EMSCRIPTEN_KEEPALIVE
gme_type_t gme_get_ay_type() {
	return gme_ay_type;
}

EMSCRIPTEN_KEEPALIVE
gme_type_t gme_get_gbs_type() {
	return gme_gbs_type;
}

EMSCRIPTEN_KEEPALIVE
gme_type_t gme_get_gym_type() {
	return gme_gym_type;
}

EMSCRIPTEN_KEEPALIVE
gme_type_t gme_get_hes_type() {
	return gme_hes_type;
}

EMSCRIPTEN_KEEPALIVE
gme_type_t gme_get_kss_type() {
	return gme_kss_type;
}

EMSCRIPTEN_KEEPALIVE
gme_type_t gme_get_nsf_type() {
	return gme_nsf_type;
}

EMSCRIPTEN_KEEPALIVE
gme_type_t gme_get_nsfe_type() {
	return gme_nsfe_type;
}

EMSCRIPTEN_KEEPALIVE
gme_type_t gme_get_sap_type() {
	return gme_sap_type;
}

EMSCRIPTEN_KEEPALIVE
gme_type_t gme_get_spc_type() {
	return gme_spc_type;
}

EMSCRIPTEN_KEEPALIVE
gme_type_t gme_get_vgm_type() {
	return gme_vgm_type;
}

EMSCRIPTEN_KEEPALIVE
gme_type_t gme_get_vgz_type() {
	return gme_vgz_type;
}

#ifdef __cplusplus
	}
#endif

#endif
