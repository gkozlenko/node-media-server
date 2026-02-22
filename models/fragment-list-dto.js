'use strict';

class FragmentListDto {

    constructor(payload) {
        this.buffer = payload.buffer;
        this.metadata = payload.metadata;
    }

    maxFragmentDuration() {
        return this.metadata.maxFragmentDuration || 0;
    }

    bandwidth() {
        return this.metadata.bandwidth || 0;
    }

    videoResolution() {
        return this.metadata.videoResolution;
    }

    codecStrings() {
        return this.metadata.codecs || [];
    }

    fragmentDurations() {
        return new Float64Array(this.buffer);
    }

    static encode(fragmentList) {
        const maxFragmentDuration = fragmentList.maxFragmentDuration();

        const duration = fragmentList.relativeDuration();
        const bandwidth = duration > 0 ? Math.round(8 * fragmentList.size() / duration) : 0;

        const videoResolution = fragmentList.video ? `${fragmentList.video.width}x${fragmentList.video.height}` : null;

        const codecStrings = [fragmentList.video, fragmentList.audio]
            .filter(data => data !== null)
            .map(data => data.codec)
            .filter(codec => Boolean(codec));

        const fragmentDurations = new Float64Array(fragmentList.count());
        for (let i = 0, l = fragmentList.count(); i < l; i++) {
            fragmentDurations[i] = fragmentList.get(i).relativeDuration();
        }

        return {
            buffer: fragmentDurations.buffer,
            metadata: {
                maxFragmentDuration,
                bandwidth,
                videoResolution,
                codecStrings,
            },
        };
    }

}

module.exports = FragmentListDto;
