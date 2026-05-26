(function(){
  const KEY = 'diet_h5_db';
  const today = () => new Date().toISOString().slice(0,10);

  class DietDataManager {
    constructor(){
      this.data = this.load();
      this.apiMode = false;
      this.apiBase = '';
    }

    load(){
      try {
        const raw = localStorage.getItem(KEY);
        if (raw) return JSON.parse(raw);
      } catch {}
      const init = { settings:{ startDate: today() }, days:{} };
      try { localStorage.setItem(KEY, JSON.stringify(init)); } catch {}
      return init;
    }

    save(){
      try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch {}
    }

    setApiBase(){ return false; }
    async initRemote(){ return false; }
    async pushRemote(){ return false; }

    ensureDay(date){
      if (!this.data.days[date]) {
        this.data.days[date] = {
          date,
          goals:{ diet:false, exercise:false, sleep:false },
          note:'',
          meals:{ breakfast:{note:'',images:[]}, lunch:{note:'',images:[]}, dinner:{note:'',images:[]} },
          weights:[],
          summary:''
        };
      }
      return this.data.days[date];
    }

    getAllDays(){
      return Object.values(this.data.days || {});
    }

    dayIndex(date){
      const a = new Date((this.data.settings.startDate || today()) + 'T00:00:00');
      const b = new Date(date + 'T00:00:00');
      return Math.max(1, Math.floor((b - a) / 86400000) + 1);
    }

    prevDate(date){
      const d = new Date(date + 'T00:00:00');
      d.setDate(d.getDate()-1);
      return d.toISOString().slice(0,10);
    }

    lastWeight(date){
      const day = this.data.days[date];
      if (!day || !day.weights.length) return null;
      return day.weights[day.weights.length-1].weight;
    }

    delta(date){
      const t = this.lastWeight(date);
      const y = this.lastWeight(this.prevDate(date));
      if (t == null || y == null) return null;
      return Number((t - y).toFixed(1));
    }

    exportJson(){
      const blob = new Blob([JSON.stringify(this.data, null, 2)], { type:'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `diet-data-${today()}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    }
  }

  window.DietDataManager = DietDataManager;
  window.dietDataManager = new DietDataManager();
  window.dietDataManagerReady = Promise.resolve(false);
})();
