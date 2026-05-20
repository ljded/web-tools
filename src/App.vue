<script setup lang="ts">
import { RouterView } from 'vue-router'
import Layout from './components/Layout.vue'
import Snackbar from './components/Snackbar.vue'
import { useSnackbarStore } from './stores/snackbar'

const snackbar = useSnackbarStore()
</script>

<template>
  <Layout>
    <RouterView />
  </Layout>
  <Snackbar v-model:show="snackbar.show" :message="snackbar.message" />
</template>
