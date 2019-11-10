class TTLCache {
    constructor(opts) {
        opts = opts || {};
        this._store = {};
        this._size = 0;
        this._ttl = Number(opts.ttl);
        this._capacity = Infinity;
        this.setCapacity(opts.capacity);
    }
    put(key, val, ttl) {
        if (key === undefined || val === undefined) {
            return;
        }
        if (!this._store[key] && this.size() >= this._capacity) {
            return;
        }
        ttl = ttl === undefined ? this._ttl : Number(ttl);
        this.del(key);
        this._store[key] = {
            val: val,
            expire: now() + ttl,
            timeout: setTimeout(
                function() {
                    this.del(key);
                }.bind(this),
                ttl
            )
        };
        this._size += 1;
    }
    get(key) {
        let rec = this._store[key];
        if (rec) {
            if (!(rec.expire && rec.expire > now())) {
                this.del(key);
                rec = undefined;
            }
        }
        return rec && rec.val;
    }
    del(key) {
        if (this._store[key]) {
            let val = this._store[key].val;
            clearTimeout(this._store[key].timeout);
            delete this._store[key];
            this._size -= 1;
            return val;
        }
    }
    clear() {
        Object.keys(this._store).forEach(
            function(key) {
                this.del(key);
            }.bind(this)
        );
    }
    size(accurate) {
        if (!accurate) {
            return this._size;
        }
        return Object.keys(this._store).reduce(
            function(size, key) {
                return size + (this.get(key) !== undefined ? 1 : 0);
            }.bind(this),
            0
        );
    }
    setCapacity(capacity) {
        if (typeof capacity === 'number' && capacity >= 0) {
            this._capacity = capacity;
        }
    }
}

function now() {
    return Date.now();
}

export default TTLCache;
