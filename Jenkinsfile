pipeline {
  agent any
  options { timestamps() }
  environment {
    NODE_ENV = 'test'
  }
  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Install Dependencies') {
      steps {
        sh 'pnpm install --frozen-lockfile'
      }
    }

    stage('Run Tests') {
      steps {
        sh 'pnpm run test:cov'
      }
    }

    stage('SonarQube Scan') {
      steps {
        withSonarQubeEnv('SonarQube') {
          script {
            def scannerHome = tool 'SonarScanner'
            sh "${scannerHome}/bin/sonar-scanner"
          }
        }
      }
    }

    stage('Quality Gate') {
      steps {
        timeout(time: 15, unit: 'MINUTES') {
          waitForQualityGate abortPipeline: true
        }
      }
    }
  }

  post {
    always {
      publishHTML(target: [
        reportDir: 'coverage/lcov-report',
        reportFiles: 'index.html',
        reportName: 'Backend Coverage',
        keepAll: true,
        allowMissing: true
      ])
    }
  }
}