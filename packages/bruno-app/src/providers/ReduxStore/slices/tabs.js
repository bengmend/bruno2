import find from 'lodash/find';
import filter from 'lodash/filter';
import last from 'lodash/last';
import { createSlice } from '@reduxjs/toolkit';

// todo: errors should be tracked in each slice and displayed as toasts

const initialState = {
  tabs: [],
  activeTabUid: null
};

let recentUsedTabsStack = [];

Array.prototype.insertIfNotLast = function (tabUid) {
  if (recentUsedTabsStack[recentUsedTabsStack.length - 1] === tabUid) {
    return;
  }
  recentUsedTabsStack.push(tabUid);
};

const tabTypeAlreadyExists = (tabs, collectionUid, type) => {
  return find(tabs, (tab) => tab.collectionUid === collectionUid && tab.type === type);
};

export const tabsSlice = createSlice({
  name: 'tabs',
  initialState,
  reducers: {
    addTab: (state, action) => {
      const alreadyExists = find(state.tabs, (tab) => tab.uid === action.payload.uid);
      if (alreadyExists) {
        return;
      }

      if (['variables', 'collection-settings', 'collection-runner'].includes(action.payload.type)) {
        const tab = tabTypeAlreadyExists(state.tabs, action.payload.collectionUid, action.payload.type);
        if (tab) {
          state.activeTabUid = tab.uid;
          return;
        }
      }

      state.tabs.push({
        uid: action.payload.uid,
        collectionUid: action.payload.collectionUid,
        requestPaneWidth: null,
        requestPaneTab: action.payload.requestPaneTab || 'params',
        responsePaneTab: 'response',
        type: action.payload.type || 'request'
      });
      state.activeTabUid = action.payload.uid;
      recentUsedTabsStack.insertIfNotLast(state.activeTabUid);
    },
    focusTab: (state, action) => {
      state.activeTabUid = action.payload.uid;
      recentUsedTabsStack.insertIfNotLast(state.activeTabUid);
    },
    switchTab: (state, action) => {
      if (!state.tabs || !state.tabs.length) {
        state.activeTabUid = null;
        return;
      }

      const direction = action.payload.direction;

      const activeTabIndex = state.tabs.findIndex((t) => t.uid === state.activeTabUid);

      let toBeActivatedTabIndex = 0;
      let toBeActivatedTabUid;

      if (direction === 'pageup') {
        if (activeTabIndex == 0) {
          toBeActivatedTabIndex = state.tabs.length - 1;
        } else {
          toBeActivatedTabIndex = activeTabIndex - 1;
        }
        toBeActivatedTabUid = state.tabs[toBeActivatedTabIndex].uid;
        recentUsedTabsStack.insertIfNotLast(state.activeTabUid);
      } else if (direction === 'pagedown') {
        if (activeTabIndex == state.tabs.length - 1) {
          toBeActivatedTabIndex = 0;
        } else {
          toBeActivatedTabIndex = activeTabIndex + 1;
        }
        toBeActivatedTabUid = state.tabs[toBeActivatedTabIndex].uid;
        recentUsedTabsStack.insertIfNotLast(state.activeTabUid);
      } else if (direction === 'tab') {
        if (recentUsedTabsStack.length === 0) return;

        toBeActivatedTabUid = recentUsedTabsStack.pop();

        if (state.activeTabUid == toBeActivatedTabUid) {
          toBeActivatedTabUid = recentUsedTabsStack.pop();
        }
      }

      state.activeTabUid = toBeActivatedTabUid;
    },
    updateRequestPaneTabWidth: (state, action) => {
      const tab = find(state.tabs, (t) => t.uid === action.payload.uid);

      if (tab) {
        tab.requestPaneWidth = action.payload.requestPaneWidth;
      }
    },
    updateRequestPaneTab: (state, action) => {
      const tab = find(state.tabs, (t) => t.uid === action.payload.uid);

      if (tab) {
        tab.requestPaneTab = action.payload.requestPaneTab;
      }
    },
    updateResponsePaneTab: (state, action) => {
      const tab = find(state.tabs, (t) => t.uid === action.payload.uid);

      if (tab) {
        tab.responsePaneTab = action.payload.responsePaneTab;
      }
    },
    closeTabs: (state, action) => {
      const activeTab = find(state.tabs, (t) => t.uid === state.activeTabUid);
      const tabUids = action.payload.tabUids || [];

      // remove the tabs from the state
      state.tabs = filter(state.tabs, (t) => !tabUids.includes(t.uid));

      recentUsedTabsStack = recentUsedTabsStack.filter((item) => item !== tabUids);

      if (activeTab && state.tabs.length) {
        const { collectionUid } = activeTab;
        const activeTabStillExists = find(state.tabs, (t) => t.uid === state.activeTabUid);

        // if the active tab no longer exists, set the active tab to the last tab in the list
        // this implies that the active tab was closed
        if (!activeTabStillExists) {
          // load sibling tabs of the current collection
          const siblingTabs = filter(state.tabs, (t) => t.collectionUid === collectionUid);

          // if there are sibling tabs, set the active tab to the last sibling tab
          // otherwise, set the active tab to the last tab in the list
          if (siblingTabs && siblingTabs.length) {
            state.activeTabUid = last(siblingTabs).uid;
          } else {
            state.activeTabUid = last(state.tabs).uid;
          }

          recentUsedTabsStack.insertIfNotLast(state.activeTabUid);
        }
      }

      if (!state.tabs || !state.tabs.length) {
        state.activeTabUid = null;
      }
    },
    closeAllCollectionTabs: (state, action) => {
      const collectionUid = action.payload.collectionUid;
      state.tabs = filter(state.tabs, (t) => t.collectionUid !== collectionUid);
      state.activeTabUid = null;
    }
  }
});

export const {
  addTab,
  focusTab,
  switchTab,
  updateRequestPaneTabWidth,
  updateRequestPaneTab,
  updateResponsePaneTab,
  closeTabs,
  closeAllCollectionTabs
} = tabsSlice.actions;

export default tabsSlice.reducer;
