#!/bin/bash
SERVICE_NAME="hinas"
status=$(systemctl is-active --quiet $SERVICE_NAME; echo $?)

INSTALL_PATH="/etc/zhinan"
#判断文件夹是否存在
if [ -d "$INSTALL_PATH" ]; then
    echo -e "文件夹存在已跳过"
else
    echo  -e "文件夹不存在-正在创建文件夹"
    sudo -u root mkdir $INSTALL_PATH
fi

# Get platform
if command -v arch >/dev/null 2>&1; then
  platform=$(arch)
else
  platform=$(uname -m)
fi

case "$platform" in
  amd64 | x86_64)
    ARCH="x86_64"
    ;;
  arm64 | aarch64 | *armv8*)
    ARCH="aarch64"
    ;;
  *armv7*)
    ARCH="armv7"
    ;;
  *arm*)
    ARCH="arm"
    ;;
  mips)
    ARCH="mips"
    ;;
  mipsel)
    ARCH="mipsel"
    ;;
  *)
    ARCH="UNKNOWN"
    ;;
esac

# support hf
if [[ "$ARCH" == "armv7" || "$ARCH" == "arm" ]]; then
  if cat /proc/cpuinfo | grep Features | grep -i 'half' >/dev/null 2>&1; then
    ARCH=${ARCH}hf
  fi
fi

echo -e "Your platform: ${ARCH} (${platform})" 1>&2

GH_PROXY='https://ghfast.top/'

  # Get version number
  RESPONSE=$(curl -s "${GH_PROXY}https://api.github.com/repos/EasyTier/EasyTier/releases/latest")
  LATEST_VERSION=$(echo "$RESPONSE" | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/')
  LATEST_VERSION=$(echo -e "$LATEST_VERSION" | tr -d '[:space:]')
  LATEST_VERSION="v2.3.2"
  if [ -z "$LATEST_VERSION" ]; then
    echo -e "Opus, failure to get latest version. Check your internel"
  fi

  # Download
  echo -e "Downloading EasyTier $LATEST_VERSION ..."
  rm -rf /tmp/easytier_tmp_install.zip
  curl -L ${GH_PROXY}https://github.com/EasyTier/EasyTier/releases/latest/download/easytier-linux-${ARCH}-${LATEST_VERSION}.zip -o /tmp/easytier_tmp_install.zip $CURL_BAR
  # Unzip resource
  echo -e "\r\n${green}Unzip resource ...${re}"
  unzip -o /tmp/easytier_tmp_install.zip -d $INSTALL_PATH/
#  mkdir $INSTALL_PATH/config
  mv $INSTALL_PATH/easytier-linux-${ARCH}/easytier-core $INSTALL_PATH/zhinan
  rm -rf $INSTALL_PATH/easytier-linux-${ARCH}/
  chmod +x $INSTALL_PATH/zhinan
  if [ -f $INSTALL_PATH/zhinan ]; then
    echo -e "${green} Download successfully! ${re}"
  else
    echo -e "${red} Download failed! ${re}"
  fi
  rm -rf /tmp/easytier_tmp_install.zip
#安装结束


if [ -z "$1" ]; then
	s_name="--hostname $ip_wz"
else
	s_name="--hostname $1"
fi
# 尝试获取中文地址
ip_wz=$(curl -s -4 ping0.cc/geo | awk 'NR==2')
# 去除空格
ip_wz=$(echo "$ip_wz" | tr -d ' ')
# 判断是否为空
if [ -z "$ip_wz" ]; then
    echo "中文地址为空，将采用IP命名"
    ip_wz=$(curl -s 4.ipw.cn)
fi
echo "将以 $ip_wz 命名"

random_string=$(openssl rand -base64 12 | tr -dc 'A-Za-z0-9' | head -c 16)
machineid=$random_string

cat <<-EOF > /$INSTALL_PATH/hinas.service
[Unit]
Description=EasyTier Service
After=network.target syslog.target
Wants=network.target

[Service]
Type=simple
ExecStart=$INSTALL_PATH/zhinan -d -w billy74 --machine-id=$machineid  $s_name

[Install]
WantedBy=multi-user.target
EOF


echo "正在写出配置文件"

  if [ -f $INSTALL_PATH/hinas.service ]; then
    echo  "service successfully! "
    sudo -u root mv $INSTALL_PATH/hinas.service /etc/systemd/system/hinas.service
  else
    echo  "service failed! "
    exit 1
  fi
  
echo "写出配置文件完成 正在配置开机启动"
sudo -u root systemctl enable hinas.service
echo "开机启动已完成 正在重载服务"
sudo -u root systemctl daemon-reload
echo "重启配置完成 准备重启服务"
sudo -u root systemctl restart hinas.service
echo "重启服务完成"
curl -s -4 ping0.cc/geo
echo "显示当前网络"
rm $0

