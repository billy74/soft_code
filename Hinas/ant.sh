#!/bin/bash
export LANG=en_US.UTF-8
#######################################

# 获取服务状态

SERVICE_NAME="hinas"
status=$(systemctl is-active --quiet $SERVICE_NAME; echo $?)

# if [ $# -ne 1 ]; then
   #echo "请使用:bash $0 设备名 进行使用"
   ip_wz=`curl -s -4 ping0.cc/geo | awk 'NR==2'`
   ip_wz=${ip_wz// /}
   echo "未使用设备名，将以 $ip_wz 命名"
# else

INSTALL_PATH="/etc/zhinan"
sudo -u root mkdir $INSTALL_PATH
# check if unzip is installed
if ! command -v unzip >/dev/null 2>&1; then
  echo -e "\r\n${red}Error: unzip is not installed${re}\r\n"
  exit 1
fi

# check if curl is installed
if ! command -v curl >/dev/null 2>&1; then
  echo -e "\r\n${red}Error: curl is not installed${re}\r\n"
  exit 1
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

echo -e "\r\n${green}Your platform: ${ARCH} (${platform}) ${re}\r\n" 1>&2

GH_PROXY='https://ghfast.top/'

  # Get version number
  RESPONSE=$(curl -s "https://api.github.com/repos/EasyTier/EasyTier/releases/latest")
  LATEST_VERSION=$(echo "$RESPONSE" | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/')
  LATEST_VERSION=$(echo -e "$LATEST_VERSION" | tr -d '[:space:]')

  if [ -z "$LATEST_VERSION" ]; then
    echo -e "\r\n${red}Opus${re}, failure to get latest version. Check your internel\r\nOr try ${green}install by band${re}\r\n"
    exit 1
  fi

  # Download
  echo -e "\r\n${green}Downloading EasyTier $LATEST_VERSION ...${re}"
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
    exit 1
  fi
  rm -rf /tmp/easytier_tmp_install.zip
#安装结束
if [ -z "$1" ]; then
	s_name="--hostname $ip_wz"
else
	s_name="--hostname $1"
fi


cat <<-EOF > /$INSTALL_PATH/hinas.service
[Unit]
Description=EasyTier Service
After=network.target syslog.target
Wants=network.target

[Service]
Type=simple
ExecStart=$INSTALL_PATH/zhinan -d $s_name --network-name hinas --network-secret hnas@123 -p tcp://public.easytier.top:11010

[Install]
WantedBy=multi-user.target
EOF


echo "正在写出配置文件"
sudo -u root mv $INSTALL_PATH/hinas.service /etc/systemd/system/hinas.service
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
# fi

