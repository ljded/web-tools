<script setup lang="ts">
import { RouterView } from 'vue-router'
import Layout from './components/Layout.vue'
import Snackbar from './components/Snackbar.vue'
import ErrorBoundary from './components/ErrorBoundary.vue'
</script>

<template>
  <Layout>
    <ErrorBoundary>
      <RouterView />
    </ErrorBoundary>
  </Layout>
  <Snackbar />
</template>
