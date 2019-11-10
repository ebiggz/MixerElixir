<template>
    <div v-cloak id="me-emote-autocomplete" class="me-autocomplete" v-show="showMenu">
        <ul role="listbox">
            <li v-for="(emote, index) in filteredEmotes" v-bind:key="emote.id" :id="getEmoteElementId(emote)">
                <button
                    class="me-autocomplete-emote"
                    :class="{ selected: isSelected(index) }"
                    style="align-items: center;display: inline-flex;"
                    v-on:click="autocompleteEmote(emote)"
                >
                    <span class="elixr-custom-emote twentyfour me-emotes-preview">
                        <img :src="emoteUrl(emote)" />
                    </span>
                    <span class="emote-name">{{ emote.name }}</span>
                </button>
            </li>
        </ul>
        <div class="me-autocomplete-footer">
            <span>Press <b>tab</b> to autocomplete.</span>
        </div>
    </div>
</template>

<script>
import { updateChatTextfield } from '../../utils';
export default {
    data: function() {
        return {
            show: false,
            query: '',
            emotes: [],
            selectedEmoteIndex: 0,
            currentStreamerId: 0
        };
    },
    computed: {
        filteredEmotes: function() {
            return this.emotes.filter(e => e.name.toLowerCase().startsWith(this.query.toLowerCase()));
        },
        showMenu: function() {
            return this.query != null && this.query.length > 0 && this.filteredEmotes.length > 0;
        }
    },
    watch: {
        query: function() {
            if (this.selectedEmoteIndex > this.filteredEmotes.length - 1) {
                this.selectedEmoteIndex = 0;
            }
            this.scrollSelectedIntoView();
        }
    },
    methods: {
        getEmoteElementId: function(emote) {
            return (emote.global ? 'global-' : 'channel-') + emote.name;
        },
        scrollSelectedIntoView: function() {
            let selectedEmote = this.filteredEmotes[this.selectedEmoteIndex];
            if (selectedEmote) {
                const emoteElementId = this.getEmoteElementId(selectedEmote);
                const element = document.getElementById(emoteElementId);
                if (element) {
                    element.scrollIntoView(false);
                }
            }
        },
        incrementSelectedEmote: function() {
            if (this.selectedEmoteIndex >= this.filteredEmotes.length - 1) {
                this.selectedEmoteIndex = 0;
            } else {
                this.selectedEmoteIndex++;
            }
            this.scrollSelectedIntoView();
        },
        decrementSelectedEmote: function() {
            if (this.selectedEmoteIndex <= 0) {
                this.selectedEmoteIndex = this.filteredEmotes.length - 1;
            } else {
                this.selectedEmoteIndex--;
            }
            this.scrollSelectedIntoView();
        },
        computeRows: function() {
            const rects = [...this.$el.getElementsByClassName('me-autocomplete-emote')].map(el =>
                el.getBoundingClientRect()
            );
            const rows = [[]];
            var currentRowHeight = Math.floor(rects[0].y);
            for (let i = 0; i < rects.length; i++) {
                if (Math.floor(rects[i].y) == currentRowHeight) {
                    rows[rows.length - 1].push({ index: i, pos: rects[i].x });
                } else {
                    rows.push([]);
                    currentRowHeight = Math.floor(rects[i].y);
                    rows[rows.length - 1].push({ index: i, pos: rects[i].x });
                }
            }
            return rows;
        },
        incrementSelectedEmoteRow: function() {
            const rows = this.computeRows();

            const currentRowIndex = rows.findIndex(row =>
                row.find(posData => posData.index === this.selectedEmoteIndex)
            );
            let targetRowIndex;
            if (currentRowIndex >= rows.length - 1) {
                if (this.selectedEmoteIndex == this.filteredEmotes.length - 1) {
                    this.selectedEmoteIndex = 0;
                } else {
                    this.selectedEmoteIndex = this.filteredEmotes.length - 1;
                }
                this.scrollSelectedIntoView();
                return;
            }

            targetRowIndex = currentRowIndex + 1;

            const currentPos = rows[currentRowIndex].find(posData => posData.index === this.selectedEmoteIndex).pos;
            this.selectedEmoteIndex = rows[targetRowIndex].reduce((result, next) =>
                Math.abs(currentPos - next.pos) < Math.abs(currentPos - result.pos) ? next : result
            ).index;

            this.scrollSelectedIntoView();
        },
        decrementSelectedEmoteRow: function() {
            const rows = this.computeRows();

            const currentRowIndex = rows.findIndex(row =>
                row.find(posData => posData.index === this.selectedEmoteIndex)
            );
            let targetRowIndex;
            if (currentRowIndex <= 0) {
                if (this.selectedEmoteIndex == 0) {
                    this.selectedEmoteIndex = this.filteredEmotes.length - 1;
                } else {
                    this.selectedEmoteIndex = 0;
                }
                this.scrollSelectedIntoView();
                return;
            }

            targetRowIndex = currentRowIndex - 1;

            const currentPos = rows[currentRowIndex].find(posData => posData.index === this.selectedEmoteIndex).pos;
            this.selectedEmoteIndex = rows[targetRowIndex].reduce((result, next) =>
                Math.abs(currentPos - next.pos) < Math.abs(currentPos - result.pos) ? next : result
            ).index;

            this.scrollSelectedIntoView();
        },
        isSelected: function(index) {
            return index === this.selectedEmoteIndex;
        },
        escapeHTML: function(unsafeText) {
            let div = document.createElement('div');
            div.innerText = unsafeText;
            return div.innerHTML.replace(/"/g, '&quot;');
        },
        emoteUrl: function(emote) {
            let url;
            if (emote.global) {
                url = `https://crowbartools.com/user-content/emotes/global/${this.escapeHTML(emote.filename)}`;
            } else {
                url = `https://crowbartools.com/user-content/emotes/live/${this.currentStreamerId}/${this.escapeHTML(
                    emote.filename
                )}`;
            }
            return url;
        },
        autocompleteSelectedEmote: function() {
            let selectedEmote = this.filteredEmotes[this.selectedEmoteIndex];
            if (selectedEmote) {
                this.autocompleteEmote(selectedEmote);
            }
        },
        autocompleteEmote: function(emote) {
            let textArea = $('#chat-input').children('textarea');

            let currentText = textArea.val();

            let currentMinusQuery = currentText.substring(0, currentText.length - this.query.length);

            updateChatTextfield(currentMinusQuery + emote.name + ' ');

            this.query = '';

            this.selectedEmoteIndex = 0;
            textArea.focus();
        }
    }
};
</script>
