<template>
    <div v-cloak id="me-slow-chat-timer" class="me-slow-chat-timer-wrapper">
        <div
            class="me-slow-chat-timer me-tooltip"
            title="MixrElixr: Slow Chat Cooldown"
            :class="{ hidden: this.cooldownExpired }"
        >
            <div>{{ display }}</div>
        </div>
    </div>
</template>

<script>
export default {
    data: function() {
        return {
            timerIntervalId: null,
            currentSeconds: 0,
            cooldown: 0
        };
    },
    methods: {
        padTime(time) {
            return (time < 10 ? '0' : '') + time;
        },
        startTimer() {
            if (this.timerIntervalId) {
                clearInterval(this.timerIntervalId);
            }
            this.currentSeconds = this.cooldown;
            this.timerIntervalId = setInterval(() => this.currentSeconds--, 1000);
        }
    },
    computed: {
        minutes: function() {
            const minutes = Math.floor(this.currentSeconds / 60);
            return minutes;
        },
        seconds: function() {
            const seconds = this.currentSeconds - this.minutes * 60;
            return this.padTime(seconds);
        },
        display() {
            return `${this.minutes}:${this.seconds}`;
        },
        cooldownExpired() {
            return this.currentSeconds < 1;
        }
    },
    watch: {
        currentSeconds(value) {
            // stop interval if timer has finished
            if (value === 0) {
                clearInterval(this.timerIntervalId);
                this.timerIntervalId = null;
            }
        }
    }
};
</script>

<style lang="scss" scoped>
.me-slow-chat-timer-wrapper {
    right: 0;
    left: 0;
    bottom: calc(100% - 7px);
    position: absolute;
    display: flex;
    justify-content: flex-end;
    padding-right: 6px;
    overflow: hidden;

    .me-slow-chat-timer {
        font-family: monospace;
        font-size: 11px;
        padding: 2px 5px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #b54343;
        transition: opacity 100ms ease-in-out;

        &.hidden {
            opacity: 0;
        }
    }
}
</style>
