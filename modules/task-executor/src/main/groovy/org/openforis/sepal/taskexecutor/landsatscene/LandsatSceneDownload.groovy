package org.openforis.sepal.taskexecutor.landsatscene

import org.openforis.sepal.taskexecutor.api.*
import org.openforis.sepal.taskexecutor.util.FileOwner
import org.openforis.sepal.taskexecutor.util.download.Download

import java.util.concurrent.ArrayBlockingQueue
import java.util.concurrent.BlockingQueue
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicInteger

import static org.openforis.sepal.taskexecutor.util.download.Download.State.CANCELED
import static org.openforis.sepal.taskexecutor.util.download.Download.State.COMPLETED
import static org.openforis.sepal.taskexecutor.util.download.Download.State.FAILED

class LandsatSceneDownload implements TaskExecutor {
    private final Task task
    private final File workingDir
    private final S3Landsat8Download s3Landsat8Download
    private final GoogleLandsatDownload googleLandsatDownload
    private final BlockingQueue<ExecutionResult> sceneResults
    private final AtomicInteger completedSceneCount = new AtomicInteger()
    private final AtomicBoolean canceled = new AtomicBoolean()
    private final List<String> sceneIds
    private final Map<String, List<Download>> downloadsBySceneId = new ConcurrentHashMap<>()
    private final String username

    private LandsatSceneDownload(Task task, Factory factory) {
        this.task = task
        this.workingDir = factory.workingDir
        this.s3Landsat8Download = factory.s3Landsat8Download
        this.googleLandsatDownload = factory.googleLandsatDownload
        this.username = factory.username
        sceneIds = task.params.sceneIds
        sceneResults = new ArrayBlockingQueue(sceneIds.size())
    }

    String getTaskId() {
        return task.id
    }

    void execute() {
        FileOwner.setOnDir(workingDir, username) // Make sure we have a workingDir with proper ownership
        for (def sceneId : sceneIds) {
            downloadSceneInBackground(sceneId)
        }
        waitUntilScenesAreDownloaded()
    }

    Progress progress() {
        def completedSceneCount = completedSceneCount.get()
        def sceneCount = sceneIds.size()
        if (completedSceneCount == sceneCount)
            return new Progress("Completed $sceneCount scene${sceneCount > 1 ? 's' : ''}")
        def downloadMessage = "Completed ${completedSceneCount} of ${sceneCount} scenes"
        def downloads = downloadsBySceneId.values().flatten()
        def allDownloadsCompleted = downloads.every() { it.hasCompleted() }
        if (allDownloadsCompleted)
            return new Progress(downloadMessage + " (Unpacking scenes)")
        def bytesDownloaded = downloads.sum { it.downloadedBytes } ?: 0
        def gbDownloaded = bytesDownloaded / 1024d / 1024d / 1024d // KB / MB / GB
        return new Progress(downloadMessage + " (${gbDownloaded.round(3)} GB transfered)")
    }

    private waitUntilScenesAreDownloaded() {
        def sceneCount = sceneIds.size()
        sceneCount.times {
            def executionResult = sceneResults.take() // Wait until scene is completed
            completedSceneCount.incrementAndGet()
            if (executionResult.failure)
                throw new TaskFailed(task, executionResult.message)
        }
    }

    private synchronized void downloadSceneInBackground(String sceneId) {
        if (canceled.get())
            return
        def sceneDir = new File(workingDir, sceneId)
        sceneDir.mkdir()
        FileOwner.setOnDir(sceneDir, username)
        def onCompletion = { ExecutionResult result ->
            sceneResults.add(result)
        }

        def downloads = null
        if (sceneId.startsWith('LC8'))
            downloads = s3Landsat8Download.downloadInBackground(sceneId, sceneDir, onCompletion)
        if (!downloads)
            downloads = [googleLandsatDownload.downloadInBackground(sceneId, sceneDir, onCompletion)]
        downloadsBySceneId[sceneId] = downloads
    }

    synchronized void cancel() {
        canceled.set(true)
        s3Landsat8Download.cancel()
        downloadsBySceneId
                .values()
                .flatten()
                .findAll { ![COMPLETED, FAILED, CANCELED].contains(it.state) }
                .each { it.cancel() }
    }

    static class Factory implements TaskExecutorFactory {
        final File workingDir
        final S3Landsat8Download s3Landsat8Download
        final GoogleLandsatDownload googleLandsatDownload
        final String username

        Factory(File workingDir, S3Landsat8Download s3Landsat8Download, GoogleLandsatDownload googleLandsatDownload, String username) {
            this.workingDir = workingDir
            this.s3Landsat8Download = s3Landsat8Download
            this.googleLandsatDownload = googleLandsatDownload
            this.username = username
        }

        TaskExecutor create(Task task) {
            return new LandsatSceneDownload(task, this)
        }
    }
}
