import { ActionPanel, List, Action, Icon, showToast, Toast, confirmAlert, Form } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { useState, useEffect } from "react";
import fs from "fs";
import yaml from "js-yaml";
import os from "os";
import { exec } from "child_process";

interface KubeContext {
  name: string;
  cluster: string;
  user: string;
}

interface ImportKubeconfigFormValues {
  configContent: string;
  contextName: string;
}

export default function Command() {
  const [contexts, setContexts] = useState<KubeContext[]>([]);
  const [currentContext, setCurrentContext] = useState<string>("");

  useEffect(() => {
    loadContexts();
  }, []);

  // 加载 kubeconfig 文件并解析上下文
  const loadContexts = () => {
    try {
      const kubeconfig = yaml.load(fs.readFileSync(`${os.homedir()}/.kube/config`, "utf8")) as any;
      const contextList = kubeconfig.contexts.map((ctx: any) => ({
        name: ctx.name,
        cluster: ctx.context.cluster,
        user: ctx.context.user,
      }));
      setContexts(contextList);
      setCurrentContext(kubeconfig["current-context"]);
    } catch (error) {
      showToast(Toast.Style.Failure, "Failed to load kubeconfig");
    }
  };

  // 切换上下文
  const switchContext = async (contextName: string) => {
    try {
      await runCommand(`kubectl config use-context ${contextName}`);
      setCurrentContext(contextName);
      showToast(Toast.Style.Success, "Context switched successfully");
    } catch (error) {
      showToast(Toast.Style.Failure, "Failed to switch context");
    }
  };

  // 删除上下文
  const deleteContext = async (contextName: string) => {
    if (await confirmAlert({ title: "Delete Context", message: `Are you sure you want to delete ${contextName}?` })) {
      try {
        // 读取当前的 kubeconfig
        const kubeconfigPath = `${os.homedir()}/.kube/config`;
        const kubeconfig = yaml.load(fs.readFileSync(kubeconfigPath, "utf8")) as any;

        // 找到要删除的上下文
        const contextToDelete = kubeconfig.contexts.find((ctx: any) => ctx.name === contextName);
        if (!contextToDelete) {
          throw new Error("Context not found");
        }

        // 删除上下文
        await runCommand(`kubectl config delete-context ${contextName}`);

        // 删除相关的集群
        const clusterName = contextToDelete.context.cluster;
        if (kubeconfig.clusters.some((cluster: any) => cluster.name === clusterName)) {
          await runCommand(`kubectl config delete-cluster ${clusterName}`);
        }

        // 删除相关的用户
        const userName = contextToDelete.context.user;
        if (kubeconfig.users.some((user: any) => user.name === userName)) {
          await runCommand(`kubectl config delete-user ${userName}`);
        }

        loadContexts();
        showToast(Toast.Style.Success, "Context and related configurations deleted successfully");
      } catch (error) {
        showToast(Toast.Style.Failure, "Failed to delete context and related configurations");
      }
    }
  };

  // 执行命令的辅助函数
  const runCommand = (command: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          reject(error);
        } else {
          resolve(stdout);
        }
      });
    });
  };

  // 新增：备份 kubeconfig 文件
  const backupKubeconfig = () => {
    try {
      const currentTime = new Date().toISOString().replace(/[:.]/g, "-");
      const backupPath = `${os.homedir()}/.kube/config_backup_${currentTime}`;
      fs.copyFileSync(`${os.homedir()}/.kube/config`, backupPath);
      showToast(Toast.Style.Success, "Kubeconfig backed up successfully", `Backup saved to ${backupPath}`);
    } catch (error) {
      showToast(Toast.Style.Failure, "Failed to backup kubeconfig");
    }
  };

  const ImportKubeconfigForm = () => {
    const { handleSubmit, itemProps } = useForm<ImportKubeconfigFormValues>({
      onSubmit: async (values) => {
        try {
          // 读取新的 kubeconfig 内容
          const newConfig = yaml.load(values.configContent) as any;

          if (values.contextName) {
            // 如果提供了新的 context 名称，则添加前缀
            const prefix = `${values.contextName}-`;
            newConfig.contexts.forEach((ctx: any) => {
              ctx.name = prefix + ctx.name;
              ctx.context.cluster = prefix + ctx.context.cluster;
              ctx.context.user = prefix + ctx.context.user;
            });
            newConfig.clusters.forEach((cluster: any) => {
              cluster.name = prefix + cluster.name;
            });
            newConfig.users.forEach((user: any) => {
              user.name = prefix + user.name;
            });
          }

          // 创建临时文件存储修改后的新 kubeconfig 内容
          const tempNewConfigFile = `${os.tmpdir()}/temp_new_kubeconfig_${Date.now()}.yaml`;
          fs.writeFileSync(tempNewConfigFile, yaml.dump(newConfig));

          // 创建临时文件用于存储合并后的 kubeconfig
          const tempMergedConfigFile = `${os.tmpdir()}/temp_merged_kubeconfig_${Date.now()}.yaml`;

          // 合并现有的 kubeconfig 和新的 kubeconfig
          await runCommand(`KUBECONFIG=${os.homedir()}/.kube/config:${tempNewConfigFile} kubectl config view --flatten > ${tempMergedConfigFile}`);

          // 将合并后的配置写回到原始 kubeconfig 文件
          fs.copyFileSync(tempMergedConfigFile, `${os.homedir()}/.kube/config`);

          // 清理临时文件
          fs.unlinkSync(tempNewConfigFile);
          fs.unlinkSync(tempMergedConfigFile);

          loadContexts();
          showToast(Toast.Style.Success, "Kubeconfig imported and merged successfully");
        } catch (error) {
          showToast(Toast.Style.Failure, "Failed to import and merge kubeconfig");
        }
      },
      validation: {
        configContent: FormValidation.Required,
      },
    });

    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm title="Import" onSubmit={handleSubmit} />
          </ActionPanel>
        }
      >
        <Form.TextArea
          title="Kubeconfig Content"
          placeholder="Paste your kubeconfig content here"
          {...itemProps.configContent}
        />
        <Form.TextField
          title="New Context Name (Optional)"
          placeholder="Enter a name for the new context (leave blank to use original names)"
          {...itemProps.contextName}
        />
      </Form>
    );
  };

  return (
    <List>
      {contexts.map((context) => (
        <List.Item
          key={context.name}
          icon={context.name === currentContext ? Icon.CheckCircle : Icon.Circle}
          title={context.name}
          subtitle={`Cluster: ${context.cluster}, User: ${context.user}`}
          actions={
            <ActionPanel>
              <Action title="Switch Context" onAction={() => switchContext(context.name)} icon={Icon.CheckCircle} />
              <Action title="Delete Context" onAction={() => deleteContext(context.name)} icon={Icon.Trash} />
              <Action.Push title="Import Kubeconfig" target={<ImportKubeconfigForm />} icon={Icon.Upload} />
              <Action title="Backup Kubeconfig" onAction={backupKubeconfig} icon={Icon.Download} />
            </ActionPanel>
          }
        />
      ))}
      <List.Item
        icon={Icon.Plus}
        title="Import Kubeconfig"
        actions={
          <ActionPanel>
            <Action.Push title="Import" target={<ImportKubeconfigForm />} />
            <Action title="Backup Kubeconfig" onAction={backupKubeconfig} icon={Icon.Download} />
          </ActionPanel>
        }
      />
    </List>
  );
}
